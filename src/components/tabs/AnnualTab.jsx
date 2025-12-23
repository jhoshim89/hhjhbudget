import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatKRW } from '../../utils/formatters';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const data = [
  { name: '1월', income: 720, expense: 310, profit: 410 },
  { name: '2월', income: 810, expense: 290, profit: 520 },
  { name: '3월', income: 750, expense: 450, profit: 300 },
  { name: '4월', income: 920, expense: 330, profit: 590 },
  { name: '5월', income: 840, expense: 310, profit: 530 },
  { name: '6월', income: 880, expense: 350, profit: 530 },
  { name: '7월', income: 850, expense: 320, profit: 530 },
  { name: '8월', income: 880, expense: 410, profit: 470 },
  { name: '9월', income: 910, expense: 350, profit: 560 },
  { name: '10월', income: 890, expense: 380, profit: 510 },
  { name: '11월', income: 950, expense: 310, profit: 640 },
  { name: '12월', income: 910, expense: 310, profit: 600 },
];

const AnalysisPanel = ({ title, children }) => (
  <div className="panel flex flex-col">
    <div className="h-10 border-b border-border flex items-center px-4 bg-panel-dark">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
    </div>
    <div className="p-4 flex-1">
      {children}
    </div>
  </div>
);

export default function AnnualTab() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-border gap-0.5">
      {/* Year Selection */}
      <div className="shrink-0 bg-panel border-b border-border p-4 flex justify-center items-center">
          <div className="flex items-center bg-background rounded border border-border p-1">
            <button className="p-1 hover:bg-slate-800 rounded text-slate-400"><ChevronLeft size={20} /></button>
            <span className="px-8 text-lg font-black text-white">2023</span>
            <button className="p-1 opacity-20 cursor-not-allowed text-slate-400"><ChevronRight size={20} /></button>
          </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-0.5 bg-border shrink-0">
        <div className="panel p-6">
           <p className="text-label">연간 총 수입</p>
           <p className="text-2xl font-black text-emerald-400">₩1.03억</p>
        </div>
        <div className="panel p-6">
           <p className="text-label">연간 총 지출</p>
           <p className="text-2xl font-black text-red-400">₩4,210만</p>
        </div>
        <div className="panel p-6">
           <p className="text-label">연간 순수익</p>
           <p className="text-2xl font-black text-white">₩6,090만</p>
        </div>
        <div className="panel p-6">
           <p className="text-label">평균 저축률</p>
           <p className="text-2xl font-black text-amber-400">59.1%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="flex-1 grid grid-cols-12 gap-0.5 bg-border overflow-hidden">
        <div className="col-span-12 md:col-span-8 panel p-6 flex flex-col">
           <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">월별 수입/지출 추이</h3>
           <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2B303B" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#161920', border: '1px solid #2B303B' }} />
                    <Bar dataKey="income" fill="#10B981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="expense" fill="#EF4444" radius={[2, 2, 0, 0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
        <div className="col-span-12 md:col-span-4 flex flex-col gap-0.5 bg-border">
           <AnalysisPanel title="월평균 지표">
              <div className="space-y-4">
                 <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">평균 수입</p>
                    <p className="text-lg font-black text-white">₩860만</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">평균 지출</p>
                    <p className="text-lg font-black text-white">₩350만</p>
                 </div>
              </div>
           </AnalysisPanel>
           <AnalysisPanel title="지출 TOP 5">
              <div className="space-y-2">
                 {[
                   { n: '대출 상환', v: 1692, p: 40 },
                   { n: '식비', v: 850, p: 20 },
                   { n: '교육비', v: 620, p: 15 },
                   { n: '관리비/가스', v: 420, p: 10 },
                   { n: '주유/교통', v: 310, p: 7 },
                 ].map(i => (
                   <div key={i.n}>
                      <div className="flex justify-between text-[10px] font-bold mb-1">
                         <span className="text-slate-300">{i.n}</span>
                         <span className="text-slate-500">{i.v}만 ({i.p}%)</span>
                      </div>
                      <div className="w-full h-1 bg-background rounded-full overflow-hidden">
                         <div className="bg-red-500/50 h-full" style={{ width: `${i.p}%` }}></div>
                      </div>
                   </div>
                 ))}
              </div>
           </AnalysisPanel>
        </div>
      </div>
    </div>
  );
}
