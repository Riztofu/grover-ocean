// Grover's Ocean on Qollab: answers the game's backend API inside the page.
// Qiskit runs in Qollab's in-browser Python (ocean/bridge.py); the boss level's
// "cast on IonQ" goes to the backend picked in Qollab's Select QPU dialog.
// IonQ backends accept one job per Run.

const fail = (message, status) => Object.assign(new Error(message), { status });

export function createHost(bridge, backend) {
  const call = async (name, ...args) => {
    const out = JSON.parse(await bridge[name].callPromising(...args));
    if (!out.ok) throw fail(out.detail, out.status);
    return out.data;
  };
  let info = null;
  let ionqUsed = false;
  const describe = async () => (info ??= await call('describe', backend));

  return {
    name: 'qollab',
    async request(path, body) {
      const json = JSON.stringify(body ?? {});
      if (path === '/api/health') return { ok: true };
      if (path === '/api/state') return call('state', json);
      if (path === '/api/sample') return call('sample', json);
      if (path === '/api/trajectory') return call('trajectory', json);
      if (path === '/api/bench') return call('bench', json);
      if (path === '/api/host') return describe();
      if (path === '/api/run-on-backend') {
        const d = await describe();
        if (d.ionq && ionqUsed) {
          throw fail('Qollab allows one IonQ job per Run, and this Run already sent one. Press Stop, then Run again to cast on IonQ once more.', 429);
        }
        ionqUsed = ionqUsed || d.ionq;
        return call('run_on_backend', backend, json);
      }
      throw fail('Not available on Qollab: ' + path, 404);
    },
  };
}
