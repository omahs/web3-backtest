import { Backtest } from '../../../lib/backtest.js';
import { DataSourceInfo } from '../../../lib/datasource/types.js';
import { StructJoesV2Strategy } from './strategy.js';
import { StructJoesV2StrategyRunner } from './strategy_runner.js';

const main = async () => {
  const sources: DataSourceInfo[] = [
    {
      chain: 'avalanche',
      protocol: 'joes-v2-dex',
      resoution: '1h',
    },
  ];
  const end = new Date()
  const bt = await Backtest.create(
    // new Date('2023-07-01'),
    new Date('2023-06-15'),
    // new Date('2023-07-01'),
    end, // Now
    sources,
  );

  // Configure Strategy
  const strategy = new StructJoesV2StrategyRunner(end);
  bt.onBefore(strategy.before.bind(strategy));
  bt.onData(strategy.onData.bind(strategy));
  bt.onAfter(strategy.after.bind(strategy));

  // Run
  await bt.run();
};

main();
