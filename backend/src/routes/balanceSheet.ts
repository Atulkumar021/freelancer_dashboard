import { Router, Request, Response } from 'express';
import Ledger from '../models/ledger';

const router = Router();

const ASSET_GROUPS = ['Fixed Assets','Capital Work-in-Progress','Investments','Sundry Debtors','Stock-in-Hand','Cash-in-Hand','Bank Accounts','Loans & Advances (Asset)','Deposits (Asset)','Other Current Assets'];
const LIAB_GROUPS  = ['Capital Account','Reserves & Surplus','Secured Loans','Unsecured Loans','Bank OD Account','Sundry Creditors','Current Liabilities','Provisions','Duties & Taxes','Loans & Liabilities'];
const CURR_ASSETS  = ['Sundry Debtors','Stock-in-Hand','Cash-in-Hand','Bank Accounts','Other Current Assets'];
const CURR_LIAB    = ['Sundry Creditors','Current Liabilities','Duties & Taxes','Bank OD Account','Provisions'];
const NON_CURR_LIAB = ['Secured Loans','Unsecured Loans','Loans & Liabilities'];
const EQUITY_GRP   = ['Capital Account','Reserves & Surplus'];

router.get('/:companyId', async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const all = await Ledger.find({ companyId }).select('name group closingBalance openingBalance isDr').lean();

  const assets   = (all as any[]).filter((l) => ASSET_GROUPS.includes(l.group));
  const liab     = (all as any[]).filter((l) => LIAB_GROUPS.includes(l.group));
  const currA    = assets.filter((l) => CURR_ASSETS.includes(l.group));
  const ncurrA   = assets.filter((l) => !CURR_ASSETS.includes(l.group));
  const currL    = liab.filter((l) => CURR_LIAB.includes(l.group));
  const ncurrL   = liab.filter((l) => NON_CURR_LIAB.includes(l.group));
  const equity   = liab.filter((l) => EQUITY_GRP.includes(l.group));

  const sum = (arr: any[]) => arr.reduce((s, l) => s + (l.closingBalance ?? 0), 0);
  const totalCA   = sum(currA);
  const totalCL   = sum(currL);
  const netWorth  = sum(equity);
  const totalDebt = sum(ncurrL) + sum(currL.filter((l) => l.group === 'Bank OD Account'));

  res.json({
    success: true, companyId,
    summary: {
      totalAssets: sum(assets), netWorth, totalDebt,
      workingCapital: totalCA - totalCL,
      currentRatio: totalCL > 0 ? +(totalCA / totalCL).toFixed(2) : 0,
      debtEquity: netWorth > 0 ? +(totalDebt / netWorth).toFixed(2) : 0,
    },
    sections: { nonCurrentAssets: ncurrA, currentAssets: currA, equity, nonCurrentLiabilities: ncurrL, currentLiabilities: currL },
  });
});

export default router;
