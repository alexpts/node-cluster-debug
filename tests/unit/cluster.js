const { assert } = require('chai');
const cluster = require('../../index');
const nativeCluster = cluster.cluster;

if (!nativeCluster.isPrimary && !nativeCluster.isMaster) {
    setTimeout(process.exit, 5000);
}

describe('Cluster debug', () => {
    describe('#resolveMinWorkerDebugPort', () => {
        afterEach('reset CLUSTER_WORKER_DEBUG_PORT', () => {
            delete process.env.CLUSTER_WORKER_DEBUG_PORT;
        });

        it('default port', () => {
            assert.equal(
                cluster.resolveMinWorkerDebugPort(),
                9230
            );
        });

        it('port from env CLUSTER_WORKER_DEBUG_PORT', () => {
            process.env.CLUSTER_WORKER_DEBUG_PORT = '9000';
            assert.equal(
                cluster.resolveMinWorkerDebugPort(),
                9000
            );
        });
    });

    describe('#getMinPortForWorker', function() {
        beforeEach(() => {
            this.ctx.workers = [];
        });

        afterEach('close workers', () => {
            let size = this.ctx.workers.length;

            if (size) {
                return new Promise((resolve, reject) => {
                    let timer = setTimeout(reject, 500);

                    nativeCluster.on('exit', () => {
                        size--;
                        if (size === 0) {
                            clearTimeout(timer);
                            resolve();
                        }
                    });

                    while (this.ctx.workers.length) {
                        const worker = this.ctx.workers.pop();
                        worker.process.kill('SIGKILL');
                    }
                });
            }
        })

        it('repeatability without fork', () => {
            let i = 3;
            while (i--) {
                assert.equal(
                    cluster.getMinPortForWorker(),
                    9230
                );
            }
        });

        it('increment after fork', () => {
            assert.equal(
                cluster.getMinPortForWorker(),
                9230
            );

            const worker = cluster.fork();
            this.ctx.workers.push(worker);

            assert.equal(
                cluster.getMinPortForWorker(),
                9231
            );
        });

        it('reuse port after worker exit', (done) => {
            const worker = cluster.fork();

            assert.equal(
                cluster.getMinPortForWorker(),
                9231
            );

            nativeCluster.on('exit', function() {
                assert.equal(
                    cluster.getMinPortForWorker(),
                    9230
                );

                done();
            });

            worker.process.kill();
        });
    });

    describe('Detect main process debug port', () => {
        it('default port', () => {
            assert.equal(
                cluster.resolveMasterDebugPort(),
                9229
            );
        });

        it('--inspect-port=port', () => {
            assert.equal(
                cluster.resolveMasterDebugPort('--inspect-port=9111'),
                9111
            );
        });

        it('--inspect=port', () => {
            assert.equal(
                cluster.resolveMasterDebugPort('--inspect=9112'),
                9112
            );
        });

        it('--inspect=:port', () => {
            assert.equal(
                cluster.resolveMasterDebugPort('--inspect=:9112'),
                9112
            );
        });

        it('--inspect-brk=port', () => {
            assert.equal(
                cluster.resolveMasterDebugPort('--inspect-brk=9112'),
                9112
            );
        });

        it('--inspect-brk=:port', () => {
            assert.equal(
                cluster.resolveMasterDebugPort('--inspect-brk=:9112'),
                9112
            );
        });

        it('--inspect-brk=host:port', () => {
            assert.equal(
                cluster.resolveMasterDebugPort('--inspect-brk=127.0.0.1:9113'),
                9113
            );
        });
    });
});
