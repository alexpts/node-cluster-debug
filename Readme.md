# Cluster-debug

![unit tests](https://github.com/alexpts/node-cluster-debug/actions/workflows/ci-tests.yml/badge.svg)

Wrapper for native cluster module

Apply strategy with minimal next port for worker debug port.
If worker is exit, port have return`s to pool ports and will be reuse next worker process.

Cluster set next free port after master process debugger on default for each fork.
ENV variable `CLUSTER_WORKER_DEBUG_PORT` set minimal port for workers debugger.

Example:

 `--inspect` (default - 127.0.0.1:9229: master debugger; 9230, 9231, ...: - worker debugger ports)

 `--inspect-brk`

 `--inspect-port=9229`

 `--inspect=:9229`

 `--inspect=0.0.0.0:9229`
