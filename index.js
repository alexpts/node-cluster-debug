const cluster = require('cluster');

/**
 * Wrapper for native cluster module
 *
 * Apply strategy with minimal next port for worker debug port.
 * If worker is exit, port have return`s to pool ports and will be reuse next worker process.
 *
 * Cluster set next free port after master process debugger on default for each fork.
 * ENV variable `CLUSTER_WORKER_DEBUG_PORT` set minimal port for workers debugger.
 *
 * Example:
 * --inspect (default - 127.0.0.1:9229: master debugger; 9230, 9231, ...: - worker debugger ports)
 * --inspect-brk
 * --inspect-port=9229
 * --inspect=:9229
 * --inspect=0.0.0.0:9229
 */
class ClusterDebug {
    /**
     * @param {import('cluster')} cluster
     */
    constructor(cluster) {
        this.cluster = cluster;

        /** @type {Object.<number, number>} */
        this.workers = {}; // {port: workerId}
        /** @type {Object.<number, number>} */
        this.ports = {}; // {port: workerId}

        this.minWokerDebugPort = this.resolveMinWorkerDebugPort();
    }

    /**
     * @protected
     * @return {number}
     */
    resolveMinWorkerDebugPort() {
        if (process.env.CLUSTER_WORKER_DEBUG_PORT) {
            return Number(process.env.CLUSTER_WORKER_DEBUG_PORT);
        }

        const cliArgs = process.execArgv.join(' ');
        return this.resolveMasterDebugPort(cliArgs) + 1;
    }

    /**
     * @protected
     * @param {string} args - cli args
     * @return {Number}
     * @link https://nodejs.org/en/docs/guides/debugging-getting-started/
     */
    resolveMasterDebugPort(args = '') {
        // --inspect-port=9229
        let match = args.match(/--inspect-port=(?<port>\d+)/);
        if (match && match.groups && match.groups.port) {
            return Number(match.groups.port);
        }

        // --inspect(-brk)=[:]9229
        match = args.match(/--inspect(?:-brk)?=(?::)?(?<port>\d{1,5})(?:\s|$)/);
        if (match && match.groups && match.groups.port) {
            return Number(match.groups.port);
        }

        // --inspect(-brk)=host:9229
        match = args.match(/--inspect(?:-brk)?=(?<host>.*?):(?<port>\d{1,5})/);
        if (match && match.groups && match.groups.port) {
            return Number(match.groups.port);
        }

        // default nodejs port is 9229
        return 9229;
    }

    /**
     * @protected
     * @return {Number}
     */
    getMinPortForWorker() {
        let port = this.minWokerDebugPort;

        while (this.ports[port]) {
            port++;
        }

        return port;
    }

    /**
     * @param {Object.<string, string>} env - Key/value pairs to add to worker process environment
     * @return {Worker}
     */
    fork(env = {}) {
        const port = this.getMinPortForWorker();

        this.setup(port);

        const worker = this.cluster.fork(env);
        this.ports[port] = worker.id;
        this.workers[worker.id] = port;

        return worker;
    }

    /**
     * @param {number} port
     * @return {void}
     */
    setup(port) {
        if ('setupPrimary' in this.cluster) {
            this.cluster.setupPrimary({ inspectPort: port });
        } else if ('setupMaster' in this.cluster) {
            this.cluster.setupMaster({ inspectPort: port });
        }
    }

    /**
     * @param {Number} workerId
     * @returns {void}
     */
    releaseWorker(workerId) {
        const port = this.workers[workerId];
        if (port) {
            delete this.workers[workerId];
            delete this.ports[port];
        }
    }
}

const instance = new ClusterDebug(cluster);

cluster.on('exit', (worker) => {
    instance.releaseWorker(worker.id);
});

module.exports = instance;
