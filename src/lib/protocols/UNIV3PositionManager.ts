import { TickMath, FullMath, tickToPrice, Tick } from '@uniswap/v3-sdk';
import { ethers, BigNumber } from 'ethers';
import { Numbers } from '../utils/utility.js';
//import { PoolHourData, UniV3DataSource } from "./datasource/univ3datasource.ts"
import * as jsbi from 'jsbi';
import { calculateL, getXReal, getYReal } from './UniV3Utils.js';
import { Uni3Snaphot, Uni3DexDataSource } from '../datasource/univ3Dex.js';
const JSBI: any = jsbi; // Hack because JSBIs types are broken

const getTickFromPrice = (price: any, pool: any, baseSelected = 0) => {
  const decimal0 =
    baseSelected && baseSelected === 1
      ? parseInt(pool.tokens[1].decimals)
      : parseInt(pool.tokens[0].decimals);
  const decimal1 =
    baseSelected && baseSelected === 1
      ? parseInt(pool.tokens[0].decimals)
      : parseInt(pool.tokens[1].decimals);
  const valToLog = parseFloat(price) * Math.pow(10, decimal0 - decimal1);
  const tickIDXRaw = Numbers.logWithBase(valToLog, 1.0001);

  tickToPrice;

  return Numbers.round(tickIDXRaw, 0);
};

const getPriceFromTick = (tick: any, pool: any, baseSelected = 0) => {
  const decimal0 =
    baseSelected && baseSelected === 1
      ? parseInt(pool.token1.decimals)
      : parseInt(pool.token0.decimals);
  const decimal1 =
    baseSelected && baseSelected === 1
      ? parseInt(pool.token0.decimals)
      : parseInt(pool.token1.decimals);
  const sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
  const ratioX192 = JSBI.multiply(sqrtRatioX96, sqrtRatioX96);
  const baseAmount = JSBI.BigInt(10 ** decimal1);
  const shift = JSBI.leftShift(JSBI.BigInt(1), JSBI.BigInt(192));
  const price =
    parseFloat(
      FullMath.mulDivRoundingUp(ratioX192, baseAmount, shift).toString(),
    ) /
    10 ** decimal0;
  return price;
};

// Calculate the liquidity share for a strategy based on the number of tokens owned
const liquidityForStrategy = (
  price: number,
  low: number,
  high: number,
  tokens0: number,
  tokens1: number,
  decimal0: number,
  decimal1: number,
) => {
  const decimal = decimal1 - decimal0;
  const lowHigh = [
    Math.sqrt(low * Math.pow(10, decimal)) * Math.pow(2, 96),
    Math.sqrt(high * Math.pow(10, decimal)) * Math.pow(2, 96),
  ];

  const sPrice = Math.sqrt(price * Math.pow(10, decimal)) * Math.pow(2, 96);
  const sLow = Math.min(...lowHigh);
  const sHigh = Math.max(...lowHigh);

  if (sPrice <= sLow) {
    return (
      tokens0 /
      ((Math.pow(2, 96) * (sHigh - sLow)) /
        sHigh /
        sLow /
        Math.pow(10, decimal0))
    );
  } else if (sPrice <= sHigh && sPrice > sLow) {
    const liq0 =
      tokens0 /
      ((Math.pow(2, 96) * (sHigh - sPrice)) /
        sHigh /
        sPrice /
        Math.pow(10, decimal0));
    const liq1 =
      tokens1 / ((sPrice - sLow) / Math.pow(2, 96) / Math.pow(10, decimal1));
    return Math.min(liq1, liq0);
  } else {
    return (
      tokens1 / ((sHigh - sLow) / Math.pow(2, 96) / Math.pow(10, decimal1))
    );
  }
};

// Calculate the number of Tokens a strategy owns at a specific price
// export const tokensForStrategy = (
//   entryPrice: number,
//   price: number,
//   minRange: number,
//   maxRange: number,
//   initalInvestment: number,
// ) => {
//   console.log(initalInvestment)
//   const L = calculateL(entryPrice, initalInvestment, minRange, maxRange);
//   const xLp = getXReal(price, minRange, maxRange, L);
//   const yLp = getYReal(price, minRange, maxRange, L);
//   const amountNow = yLp + xLp * price;
//   console.log(`L: ${L}`)
//   console.log(`xLp: ${xLp}`)
//   console.log(`yLp: ${yLp}`)
//   console.log('tokensForStrategy')
//   console.log(amountNow, initalInvestment)
//   console.log(amountNow / initalInvestment) // amountNow is always gt initalInvestment
//   return [xLp, yLp];
// };

//   entryPrice: number,
//   price: number,
//   minRange: number,
//   maxRange: number,
//   initalInvestment: number,
function tokensForStrategy(minRange: number, maxRange: number, investment: number, price: number){
  const decimal = 12
  console.log(price)
  const sqrtPrice = Math.sqrt(price * (Math.pow(10, decimal)));
  const sqrtLow = Math.sqrt(minRange * (Math.pow(10, decimal)));
  const sqrtHigh = Math.sqrt(maxRange * (Math.pow(10, decimal)));

  let delta, amount0, amount1;

  if ( sqrtPrice > sqrtLow && sqrtPrice < sqrtHigh) {
    console.log("branch a")
     delta = investment / (((sqrtPrice - sqrtLow)) + (((1 / sqrtPrice) - (1 / sqrtHigh)) * (price * Math.pow(10, decimal))));
     amount1 = delta * (sqrtPrice - sqrtLow);
     console.log(`delta: ${delta}`)
     console.log(`sqrtPrice: ${sqrtPrice}`)
     console.log(`(sqrtPrice - sqrtLow): ${(sqrtPrice - sqrtLow)}`)
     amount0 = delta * ((1 / sqrtPrice) - (1 / sqrtHigh)) * Math.pow(10, decimal);
     console.log(`((1 / sqrtPrice) - (1 / sqrtHigh)): ${((1 / sqrtPrice) - (1 / sqrtHigh))}`)
     console.log(`(1 / sqrtPrice): ${(1 / sqrtPrice)}`)
     console.log(`(1 / sqrtHigh): ${(1 / sqrtHigh)}`)
     console.log(`----`)
     console.log(`delta * (sqrtHigh - sqrtPrice): ${delta * (sqrtHigh - sqrtPrice)}`)
     console.log(`Math.sqrt(1/price): ${Math.sqrt(1/price)}`)
     console.log(`----`)
  }
  else if (sqrtPrice < sqrtLow) {
    console.log("branch b")
    delta = investment / ((((1 / sqrtLow) - (1 / sqrtHigh)) * price));
    amount1 = 0;
    amount0 = delta * ((1 / sqrtLow) - (1 / sqrtHigh));
  }
  else {
    console.log("branch c")
    delta = investment / ((sqrtHigh - sqrtLow)) ;
    amount1 = delta * (sqrtHigh - sqrtLow);
    amount0 = 0;
  }
  console.log("reserves")
  console.log(amount0, amount1)
  return [amount0, amount1];
}

export class UniV3Position {
  // pool!: ethers.Contract
  // provider!: ethers.providers.BaseProvider
  public unboundedFees: [number, number] = [0, 0];
  public snapshot: any;
  public feeToken0: number = 0;
  public feeToken1: number = 0;
  public totalSupply: number = 0;
  public valueUsd: number = 0;
  public reserves: any;
  public claimed: number = 0;
  public lpAmount: number = 0;

  constructor(
    public amount: number,
    public minRange: number,
    public maxRange: number,
    public priceToken: number,
    public entryPrice: number,
    public poolSymbol: string,
  ) {}

  public init() {}

  private activeLiquidityForCandle(
    min: number,
    max: number,
    low: number,
    high: number,
  ): number {
    const divider = high - low !== 0 ? high - low : 1;
    const ratioTrue =
      high - low !== 0
        ? (Math.min(max, high) - Math.max(min, low)) / divider
        : 1;
    let ratio = high > min && low < max ? ratioTrue * 100 : 0;

    return isNaN(ratio) || !ratio ? 0 : ratio;
  }

  private tokensFromLiquidity(
    price: number,
    low: number,
    high: number,
    liquidity: number,
    decimal0: number,
    decimal1: number,
  ): [number, number] {
    const decimal = decimal1 - decimal0;
    const lowHigh = [
      Math.sqrt(low * Math.pow(10, decimal)) * Math.pow(2, 96),
      Math.sqrt(high * Math.pow(10, decimal)) * Math.pow(2, 96),
    ];

    const sPrice = Math.sqrt(price * Math.pow(10, decimal)) * Math.pow(2, 96);
    const sLow = Math.min(...lowHigh);
    const sHigh = Math.max(...lowHigh);

    if (sPrice <= sLow) {
      const amount1 =
        (liquidity * Math.pow(2, 96) * (sHigh - sLow)) /
        sHigh /
        sLow /
        Math.pow(10, decimal0);
      return [0, amount1];
    } else if (sPrice < sHigh && sPrice > sLow) {
      const amount0 =
        (liquidity * (sPrice - sLow)) /
        Math.pow(2, 96) /
        Math.pow(10, decimal1);
      const amount1 =
        (liquidity * Math.pow(2, 96) * (sHigh - sPrice)) /
        sHigh /
        sPrice /
        Math.pow(10, decimal0);
      return [amount0, amount1];
    } else {
      const amount0 =
        (liquidity * (sHigh - sLow)) / Math.pow(2, 96) / Math.pow(10, decimal1);
      return [amount0, 0];
    }
  }
  public pool(data: Uni3Snaphot) {
    return data.data.univ3.find((p) => p.symbol === this.poolSymbol)!;
  }

  public processData(
    lastData: Uni3Snaphot,
    data: Uni3Snaphot,
    unbFees: [number, number],
  ) {
    this.unboundedFees[0] += unbFees[0];
    this.unboundedFees[1] += unbFees[1];
    const pool = this.pool(data);

    const lastPool = this.pool(lastData);
    // const posReserves = tokensForStrategy(
    //   this.entryPrice,
    //   pool.tokens[this.priceToken].price,
    //   this.minRange,
    //   this.maxRange,
    //   this.amount,
    // );
    const posReserves = tokensForStrategy(
      this.minRange,
      this.maxRange,
      this.amount,
      pool.tokens[this.priceToken].price
    );
    // const thing = tokensForStrategy(
    //   1458.30480672,
    //   2098.5361852799997,
    //   100000,
    //   1750
    // );
    // console.log(`**************`)
    // console.log(`thing: ${thing}`)
    // console.log(`**************`)

    // console.log(`this.entryPrice: ${this.entryPrice}`)
    // console.log(`pool.tokens[this.priceToken].price: ${pool.tokens[this.priceToken].price}`)
    // console.log(`this.minRange: ${this.minRange}`)
    // console.log(`this.maxRange: ${this.maxRange}`)
    // console.log(`this.amount: ${this.amount}`)
    // console.log(`posreserves: ${posReserves}`)
    // const posReserves = tokensForStrategy2(this.minRange, this.maxRange, this.amount, data.close, data.pool.token0.decimals)
    const unboundedLiquidity = liquidityForStrategy(
      this.entryPrice,
      Math.pow(1.0001, -887220),
      Math.pow(1.0001, 887220),
      posReserves[0],
      posReserves[1],
      pool.tokens[0].decimals,
      pool.tokens[1].decimals,
    );
    const liquidity = liquidityForStrategy(
      this.entryPrice,
      this.minRange,
      this.maxRange,
      posReserves[0],
      posReserves[1],
      pool.tokens[0].decimals,
      pool.tokens[1].decimals,
    );

    const low =
      this.priceToken === 0 ? pool.low : 1 / (pool.low === 0 ? 1 : pool.low);
    const high =
      this.priceToken === 0 ? pool.high : 1 / (pool.high === 0 ? 1 : pool.high);

    const lowTick = getTickFromPrice(low, pool, this.priceToken);
    const highTick = getTickFromPrice(high, pool, this.priceToken);
    const minTick = getTickFromPrice(this.minRange, pool, this.priceToken);
    const maxTick = getTickFromPrice(this.maxRange, pool, this.priceToken);

    const activeLiquidity = this.activeLiquidityForCandle(
      minTick,
      maxTick,
      lowTick,
      highTick,
    );

    const tokens = this.tokensFromLiquidity(
      this.priceToken === 1 ? 1 / pool.close : pool.close,
      this.minRange,
      this.maxRange,
      liquidity,
      pool.tokens[0].decimals,
      pool.tokens[1].decimals,
    );

    const feeToken0 = (unbFees[0] * liquidity * activeLiquidity) / 100;
    const feeToken1 = (unbFees[1] * liquidity * activeLiquidity) / 100;
    this.feeToken0 += feeToken0;
    this.feeToken1 += feeToken1;

    const feeUnb0 = unbFees[0] * unboundedLiquidity;
    const feeUnb1 = unbFees[1] * unboundedLiquidity;

    let fgV, feeV, feeUnb, amountV, feeUSD: number, amountTR;
    feeUSD = 0
    // const firstClose = this.priceToken === 1 ? 1 / data[0].close : data[0].close;
    const firstClose = this.entryPrice;

    const tokenRatioFirstClose = this.tokensFromLiquidity(
      firstClose,
      this.minRange,
      this.maxRange,
      liquidity,
      pool.tokens[0].decimals,
      pool.tokens[1].decimals,
    );
    const x0 = tokenRatioFirstClose[1];
    const y0 = tokenRatioFirstClose[0];

    if (this.priceToken === 0) {
      fgV = unbFees[0] + unbFees[1] * pool.close;
      feeV = feeToken0 + feeToken1 * pool.close;
      feeUnb = feeUnb0 + feeUnb1 * pool.close;
      amountV = tokens[0] + tokens[1] * pool.close;
      feeUSD =
        (feeV * lastPool.totalValueLockedUSD) /
        (lastPool.totalValueLockedToken1 * lastPool.close +
          lastPool.totalValueLockedToken0);
      amountTR = this.amount + (amountV - (x0 * pool.close + y0));
    } else if (this.priceToken === 1) {
      fgV = unbFees[0] / pool.close + unbFees[1];
      feeV = feeToken0 / pool.close + feeToken1;
      feeUnb = feeUnb0 + feeUnb1 * pool.close;
      amountV = tokens[1] / pool.close + tokens[0];
      feeUSD =
        (feeV * lastPool.totalValueLockedUSD) /
        (lastPool.totalValueLockedToken1 +
          lastPool.totalValueLockedToken0 / lastPool.close);
      amountTR = this.amount + (amountV - (x0 * (1 / pool.close) + y0));
    }


    //const fees = this.feeToken0 * pool.prices[0] + pool.prices[1] * this.feeToken1;
    // note: posReserves array is flipped
    console.log(`fees: ${feeUSD}`)
    this.claimed += feeUSD
    // console.log(`this.feeToken0: ${this.feeToken0}`)
    // console.log(`pool.prices[0]: ${pool.prices[0]}`)
    // console.log(`this.feeToken1: ${this.feeToken1}`)
    // console.log(`pool.prices[1]: ${pool.prices[1]}`)
    //const valueToken0 = 
    //console.log(`pool.close: ${pool.close}`)
    // console.log(`posReserves[0]: ${posReserves[0]}`)
    // console.log(`posReserves[1]: ${posReserves[1]}`)
    // console.log(`valueToken0: ${valueToken0}`)
    this.valueUsd = this.claimed + pool.prices[0] * posReserves[0] + pool.prices[1] * posReserves[1]
    console.log(`this.valueUsd: ${this.valueUsd}`)
    console.log(`pool.prices[0]: ${pool.prices[0]}`)
    console.log(`pool.prices[1]: ${pool.prices[1]}`)

    this.snapshot = {
      fg0: unbFees[0],
      fg1: unbFees[1],
      x0,
      y0,
      activeliquidity: activeLiquidity,
      fees: feeUSD,
      fgV: fgV,
      feeV: feeV,
      feeUnb: feeUnb,
      amountV: amountV,
      amountTR: amountTR,
      feeUSD: feeUSD,
      close: pool.close,
      baseClose: this.priceToken === 1 ? 1 / pool.close : pool.close,
      cumulativeFeeToken0: this.feeToken0,
      cumulativeFeeToken1: this.feeToken1,
    };
  }
}

export class UniV3PositionManager {
  lastData?: Uni3Snaphot;
  positions: UniV3Position[] = [];

  constructor() {}

  public processPoolData(data: Uni3Snaphot): boolean {
    if (!this.lastData) {
      this.lastData = data;
      return false;
    }

    for (const pos of this.positions) {
      function getPool(data: Uni3Snaphot) {
        return data.data.univ3.find((p) => p.symbol === pos.poolSymbol)!;
      }
      const pool = getPool(data);
      const lastPool = getPool(this.lastData);
      const unboundFees = this.calcUnboundedFees(
        pool.feeGrowthGlobal0X128,
        lastPool.feeGrowthGlobal0X128,
        pool.feeGrowthGlobal1X128,
        lastPool.feeGrowthGlobal1X128,
        pool,
      );
      pos.processData(this.lastData, data, unboundFees);
    }
    this.lastData = data;
    return true;
  }

  public open(
    amount: number,
    minRange: number,
    maxRange: number,
    priceToken: number,
    poolSymbol: string,
  ): UniV3Position {
    if (!this.lastData) throw new Error('wow');
    function pool(data: Uni3Snaphot) {
      return data.data.univ3.find((p) => p.symbol === poolSymbol)!;
    }
    const lastPool = pool(this.lastData);
    const pos = new UniV3Position(
      amount,
      minRange,
      maxRange,
      priceToken,
      lastPool.tokens[0].price,
      poolSymbol,
    );
    this.positions.push(pos);
    console.log(`open pos:`)
    console.log(pos)
    return pos;
  }

  // calculate the amount of fees earned in 1 period by 1 unit of unbounded liquidity //
  // fg0 represents the amount of token 0, fg1 represents the amount of token1 //
  // Borrowed from https://github.com/DefiLab-xyz/uniswap-v3-backtest
  private calcUnboundedFees(
    globalfee0: number,
    prevGlobalfee0: number,
    globalfee1: number,
    prevGlobalfee1: number,
    pool: any,
  ): [number, number] {
    const fg0_0 = globalfee0 / Math.pow(2, 128);
    const fg0_1 = prevGlobalfee0 / Math.pow(2, 128);
    const fg1_0 = globalfee1 / Math.pow(2, 128);
    const fg1_1 = prevGlobalfee1 / Math.pow(2, 128);

    const fg0 = fg0_0 - fg0_1; // fee of token 0 earned in 1 period by 1 unit of unbounded liquidity
    const fg1 = fg1_0 - fg1_1; // fee of token 1 earned in 1 period by 1 unit of unbounded liquidity

    return [fg0, fg1];
  }

  public close(pos: UniV3Position) {
    const idx = this.positions.indexOf(pos);
    const valueUsd = this.positions[idx].valueUsd;
    this.positions[idx].valueUsd = 0; // this type stuff should probably be on the Uniswap position class
    this.positions.splice(idx, 1);
    return valueUsd;
  }
}
