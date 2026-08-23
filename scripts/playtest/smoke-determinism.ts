import { HeadlessSession } from '@/game/headless';
import { createReasonableAgent } from './agents/reasonable';

async function runOnce(seed: number) {
  const session = new HeadlessSession({
    companyType: 'marketing_agency',
    managerLevel: 'director',
    format: 'classical_4q',
    seed,
  });
  const agent = createReasonableAgent(seed);
  for (let step = 0; step < 1200; step++) {
    const view = session.getState();
    if (view.gameOver) break;
    const d = await agent.decide(view);
    session.applyAction(d.action);
  }
  const s = session.getEngineState();
  const net = s.history.reduce((a, h) => a + h.netProfit, 0);
  return { seed: s.sessionSeed, bankrupt: s.bankrupt, net, weeks: s.week, rng: s.rngState };
}

async function main() {
  const a = await runOnce(40001);
  const b = await runOnce(40001);
  console.log('run A', a);
  console.log('run B', b);
  console.log('identical', JSON.stringify(a) === JSON.stringify(b));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
