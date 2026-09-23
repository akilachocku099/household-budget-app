import React, { useEffect, useMemo, useRef, useState } from 'react';
import { initialData } from './data';
import {
  MONTHS,
  calculateMetrics,
  cleanBudgetData,
  createMonthlySeries,
  formatCurrency as fmt,
  formatPercent as pct,
  getCurrentMonth,
  getMonthIndex,
} from './lib/budget';
import { useBudgetData } from './hooks/useBudgetData';

const MONTH_KEY = 'household-budget-selected-month-v1';

function App(){
  const { data, cloudStatus, isCloudEnabled, updateData, addTransaction, removeTransaction } = useBudgetData();
  const [page, setPage] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    try { return localStorage.getItem(MONTH_KEY) || getCurrentMonth(); } catch { return getCurrentMonth(); }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef();

  useEffect(() => {
    try { localStorage.setItem(MONTH_KEY, selectedMonth); } catch {}
  }, [selectedMonth]);

  const save = (next) => {
    updateData(next);
    setToast(isCloudEnabled ? 'Saved' : 'Saved on this device');
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 1800);
  };

  const metrics = useMemo(() => {
    return calculateMetrics(data, selectedMonth);
  }, [data, selectedMonth]);

  const monthlySeries = useMemo(() => createMonthlySeries(data), [data]);

  const reset = () => {
    const restored = cleanBudgetData(JSON.parse(JSON.stringify(initialData)));
    save(restored);
  };

  const handleAddTransaction = async (tx) => {
    await addTransaction(tx);
    setShowAdd(false); setPage('transactions');
  };
const handleRemoveTransaction = async (id) => {
    await removeTransaction(id);
  };
  const updateBudget = (name, value) => {
    save({...data, categories:data.categories.map(c=>c.name===name?{...c,monthlyBudget:Number(value)||0}:c)});
  };

  const updateIncome = (name, month, value) => {
    save({...data, incomes:data.incomes.map(i=>i.name===name?{...i,months:{...i.months,[month]:Number(value)||0}}:i)});
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><span></span><span></span><span></span></div>
        <div><div className="brand-name">Household</div><div className="brand-sub">Budget</div></div>
      </div>
      <nav className="nav">
        <NavItem icon="⌂" label="Dashboard" active={page==='dashboard'} onClick={()=>setPage('dashboard')}/>
        <NavItem icon="↔" label="Transactions" active={page==='transactions'} onClick={()=>setPage('transactions')}/>
        <NavItem icon="▤" label="Budget" active={page==='budget'} onClick={()=>setPage('budget')}/>
        <NavItem icon="＋" label="Income" active={page==='income'} onClick={()=>setPage('income')}/>
      </nav>
      <div className="sidebar-note"><div className="tiny-label">{isCloudEnabled ? 'CLOUD STORAGE' : 'LOCAL MODE'}</div><p>{isCloudEnabled ? `${cloudStatus}. No login screen.` : 'Your data stays in this browser.'}</p></div>
      <button className="reset-btn" onClick={reset}>Restore sample data</button>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><div className="eyebrow">PERSONAL FINANCE</div><h1>{page==='dashboard'?'Good to see your numbers in one place.':page[0].toUpperCase()+page.slice(1)}</h1></div>
        <div className="top-actions"><div className="month-picker"><span>Viewing</span><select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}>{MONTHS.map(m=><option key={m}>{m}</option>)}</select></div><button className="primary" onClick={()=>setShowAdd(true)}>+ Add expense</button></div>
      </header>

      {page==='dashboard' && <Dashboard metrics={metrics} monthlySeries={monthlySeries} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} onAdd={()=>setShowAdd(true)} />}
      {page==='transactions' && <Transactions transactions={data.transactions} onDelete={handleRemoveTransaction} />}
      {page==='budget' && <Budget categories={data.categories} selectedMonth={selectedMonth} onUpdate={updateBudget} />}
      {page==='income' && <Income incomes={data.incomes} onUpdate={updateIncome} />}
    </main>

    {showAdd && <AddExpense categories={data.categories} defaultMonth={selectedMonth} onClose={()=>setShowAdd(false)} onSave={handleAddTransaction}/>} 
    {toast && <div className="toast">{toast}</div>}
  </div>
}

function NavItem({icon,label,active,onClick}){return <button className={`nav-item ${active?'active':''}`} onClick={onClick}><span className="nav-icon">{icon}</span><span>{label}</span></button>}

function Dashboard({metrics, monthlySeries, selectedMonth, setSelectedMonth, onAdd}){
  const latest = [...metrics.current].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
  const budgetTotal = metrics.categorySpend.reduce((s,c)=>s+c.budget,0);
  const budgetUsed = budgetTotal ? metrics.currentExpenses/budgetTotal : 0;

  return <div className="page-body">
    <section className="hero-grid">
      <div className="hero-card">
        <div className="hero-copy">
          <div className="mini-label">THIS MONTH · {selectedMonth.toUpperCase()}</div>
          <div className="hero-number">{fmt(metrics.incomeCurrent)}</div>
          <div className="hero-caption">household income</div>
          <div className="hero-row">
            <div><span>Spent</span><strong>{fmt(metrics.currentExpenses)}</strong></div>
            <div><span>Left</span><strong>{fmt(metrics.savingsCurrent)}</strong></div>
            <div><span>Save</span><strong>{pct(metrics.incomeCurrent?metrics.savingsCurrent/metrics.incomeCurrent:0)}</strong></div>
          </div>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orb orb-back"></div>
          <div className="orb orb-front"></div>
          <div className="orb-label">{selectedMonth}</div>
        </div>
      </div>
      <div className="kpi-stack">
        <Kpi label="Annual income" value={fmt(metrics.annualIncome)} note="Across all sources" />
        <Kpi label="Annual expenses" value={fmt(metrics.annualExpenses)} note="Logged so far" />
        <Kpi label="Net position" value={fmt(metrics.net)} note="Income less expenses" positive={metrics.net>=0}/>
      </div>
    </section>

    <section className="grid-2 dashboard-charts">
      <div className="panel chart-panel">
        <div className="panel-head">
          <div><div className="eyebrow">FLOW</div><h2>Money through the year</h2><p className="subtext">Income and spending by month. Tap a month to update the dashboard.</p></div>
          <button className="quiet" onClick={()=>setSelectedMonth(MONTHS[(getMonthIndex(selectedMonth)+1)%MONTHS.length])}>Next month →</button>
        </div>
        <YearFlowChart monthlySeries={monthlySeries} selectedMonth={selectedMonth} onSelect={setSelectedMonth}/>
      </div>

      <div className="panel chart-panel mix-panel">
        <div className="panel-head">
          <div><div className="eyebrow">SPENDING MIX</div><h2>Where it went</h2><p className="subtext">A breakdown of {selectedMonth}'s logged spending.</p></div>
          <span className="pill">{selectedMonth}</span>
        </div>
        <SpendingDonut categorySpend={metrics.categorySpend} />
      </div>
    </section>

    <section className="grid-2 bottom-grid">
      <div className="panel">
        <div className="panel-head"><div><div className="eyebrow">RECENT</div><h2>Recent expenses</h2></div><button className="text-btn" onClick={()=>document.querySelector('.nav-item:nth-child(2)')?.click()}>View all →</button></div>
        <div className="transaction-list">{latest.length?latest.map(t=><div className="transaction-row" key={t.id}><div className="tx-date">{new Date(t.date).toLocaleDateString('en-AU',{day:'2-digit',month:'short'})}</div><div className="tx-info"><strong>{t.description}</strong><span>{t.category}</span></div><div className="tx-amount">−{fmt(t.amount)}</div></div>):<div className="empty-state"><div className="empty-icon">＋</div><strong>No expenses logged for {selectedMonth}</strong><span>Add your first expense to see it here.</span><button className="quiet" onClick={onAdd}>Add expense →</button></div>}</div>
      </div>
      <div className="panel quick-panel">
        <div className="panel-head"><div><div className="eyebrow">BUDGET PULSE</div><h2>Target vs actual</h2></div><span className={`status ${budgetTotal && budgetUsed>1?'warn':''}`}>{budgetTotal?`${Math.round(budgetUsed*100)}% used`:'Set targets'}</span></div>
        <div className="budget-pulse"><div className="ring" style={{'--p':`${Math.min(100,budgetUsed*100)}%`}}><div><strong>{budgetTotal?Math.round(budgetUsed*100):0}%</strong><span>of target</span></div></div><div className="pulse-copy"><strong>{budgetTotal?`${fmt(Math.max(0,budgetTotal-metrics.currentExpenses))} remaining`:'Your budget is ready to set up.'}</strong><p>Use the Budget page to give each category a monthly target.</p><button className="primary compact" onClick={onAdd}>Add a transaction</button></div></div>
      </div>
    </section>
  </div>
}

function YearFlowChart({monthlySeries, selectedMonth, onSelect}){
  const width = 760;
  const height = 270;
  const left = 48;
  const right = 14;
  const top = 18;
  const bottom = 38;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(...monthlySeries.flatMap(m=>[m.income,m.expenses]), 1);
  const step = maxValue > 5000 ? 2000 : maxValue > 2000 ? 1000 : 500;
  const maxY = Math.max(step, Math.ceil(maxValue / step) * step);
  const ticks = 4;
  const groupWidth = chartWidth / monthlySeries.length;
  const barWidth = Math.min(13, groupWidth * .22);
  const y = value => top + chartHeight - (value / maxY) * chartHeight;
  const moneyLabel = value => value >= 1000 ? `$${(value/1000).toFixed(value%1000 ? 1 : 0)}k` : `$${Math.round(value)}`;

  return <div className="flow-chart-wrap">
    <div className="chart-legend"><span><i className="legend-dot income"></i>Income</span><span><i className="legend-dot expense"></i>Expenses</span></div>
    <svg className="flow-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly household income and expenses">
      {Array.from({length:ticks+1},(_,i)=>{
        const value = maxY - (maxY/ticks)*i;
        const yy = y(value);
        return <g key={i}>
          <line x1={left} x2={width-right} y1={yy} y2={yy} className="chart-grid-line" />
          <text x={left-9} y={yy+4} textAnchor="end" className="chart-axis-label">{moneyLabel(value)}</text>
        </g>;
      })}
      {monthlySeries.map((m,idx)=>{
        const gx = left + idx * groupWidth;
        const center = gx + groupWidth/2;
        const incomeH = Math.max(0,(m.income/maxY)*chartHeight);
        const expenseH = Math.max(0,(m.expenses/maxY)*chartHeight);
        const isSelected = m.month===selectedMonth;
        const baseY = top + chartHeight;
        return <g key={m.month} className="flow-month" onClick={()=>onSelect(m.month)}>
          {isSelected && <rect x={gx+4} y={top-7} width={Math.max(22,groupWidth-8)} height={height-top-bottom+19} rx="10" className="chart-selected-band" />}
          <rect x={center-barWidth-2} y={baseY-incomeH} width={barWidth} height={incomeH} rx="5" className={isSelected?'chart-bar income selected':'chart-bar income'} />
          <rect x={center+2} y={baseY-expenseH} width={barWidth} height={expenseH} rx="5" className={isSelected?'chart-bar expense selected':'chart-bar expense'} />
          <text x={center} y={height-13} textAnchor="middle" className={isSelected?'chart-month selected':'chart-month'}>{m.month}</text>
          {(m.income>0 || m.expenses>0) && <title>{`${m.month}: income ${fmt(m.income)}, expenses ${fmt(m.expenses)}`}</title>}
        </g>;
      })}
    </svg>
  </div>;
}

function SpendingDonut({categorySpend}){
  const sorted = categorySpend.filter(c=>c.actual>0).sort((a,b)=>b.actual-a.actual);
  const total = sorted.reduce((s,c)=>s+c.actual,0);
  const palette = ['#1f6f5c','#d1a067','#8296a0','#a9956d','#8e7ca1','#b37d67'];
  let mix = sorted.slice(0,5).map((item,i)=>({...item,color:palette[i]}));
  const remainder = sorted.slice(5).reduce((s,c)=>s+c.actual,0);
  if(remainder>0) mix.push({name:'Other',actual:remainder,color:palette[5]});
  let cursor = 0;
  const segments = mix.map(item=>{
    const start=cursor;
    cursor += total ? item.actual/total*100 : 0;
    return `${item.color} ${start}% ${cursor}%`;
  });
  const gradient = total ? `conic-gradient(${segments.join(', ')})` : 'conic-gradient(#e7e2d7 0 100%)';

  return <div className="mix-content">
    <div className={`donut-chart ${total?'has-data':''}`} style={{background:gradient}}>
      <div className="donut-hole"><span>Total spent</span><strong>{fmt(total)}</strong><small>{total?`${sorted.length} categories`:'Nothing logged yet'}</small></div>
    </div>
    <div className="mix-legend">
      {mix.length ? mix.map(item=><div className="mix-item" key={item.name}><span className="mix-swatch" style={{background:item.color}}></span><div><strong>{item.name}</strong><span>{fmt(item.actual)}</span></div><b>{Math.round(item.actual/total*100)}%</b></div>) : <div className="empty-mix"><div className="empty-icon">◌</div><strong>No spending yet</strong><span>Add an expense for {categorySpend[0] ? 'this month' : 'the selected month'} to populate the chart.</span></div>}
    </div>
  </div>;
}

function Kpi({label,value,note,positive}) {return <div className="kpi"><div><div className="eyebrow">{label}</div><strong>{value}</strong><span>{note}</span></div><div className={`kpi-dot ${positive===false?'bad':''}`}></div></div>}

function Transactions({transactions,onDelete}){
 const [search,setSearch]=useState('');
 const filtered=transactions.filter(t=>`${t.description} ${t.category} ${t.month}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
 return <div className="page-body"><div className="panel table-panel"><div className="panel-head"><div><div className="eyebrow">LEDGER</div><h2>Every logged expense</h2></div><input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search"/></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Fortnight</th><th>Month</th><th>Category</th><th>Description</th><th className="right">Amount</th><th></th></tr></thead><tbody>{filtered.map(t=><tr key={t.id}><td>{t.date}</td><td>{t.fortnight}</td><td>{t.month}</td><td><span className="table-chip">{t.category}</span></td><td>{t.description}</td><td className="right">{fmt(t.amount)}</td><td><button className="delete" onClick={()=>onDelete(t.id)}>×</button></td></tr>)}</tbody></table></div></div></div>
}

function Budget({categories,selectedMonth,onUpdate}){return <div className="page-body"><div className="panel table-panel"><div className="panel-head"><div><div className="eyebrow">MONTHLY TARGETS</div><h2>Budget by category</h2><p className="subtext">Set a monthly target; the dashboard compares it with your actual {selectedMonth} spending.</p></div></div><div className="budget-cards">{categories.map(c=><div className="budget-card" key={c.name}><div><span className="type-tag">{c.type}</span><h3>{c.name}</h3></div><div className="budget-input"><span>$</span><input type="number" min="0" step="10" value={c.monthlyBudget} onChange={e=>onUpdate(c.name,e.target.value)}/></div><span className="annual">Annual target · {fmt(c.monthlyBudget*12)}</span></div>)}</div></div></div>}

function Income({incomes,onUpdate}){return <div className="page-body"><div className="panel table-panel"><div className="panel-head"><div><div className="eyebrow">INCOME SOURCES</div><h2>Expected monthly income</h2><p className="subtext">Edit your actual income sources; the household total is calculated automatically.</p></div></div><div className="table-wrap"><table><thead><tr><th>Source</th>{MONTHS.map(m=><th key={m}>{m}</th>)}<th className="right">Annual</th></tr></thead><tbody>{incomes.filter(i=>i.name !== 'Total Income').map(i=><tr key={i.name}><td><strong>{i.name}</strong></td>{MONTHS.map(m=><td key={m}><input className="cell-input" type="number" value={i.months[m]} onChange={e=>onUpdate(i.name,m,e.target.value)}/></td>)}<td className="right">{fmt(MONTHS.reduce((s,m)=>s+(i.months[m]||0),0))}</td></tr>)}</tbody></table></div></div></div>}

function AddExpense({categories,defaultMonth,onClose,onSave}){
 const [form,setForm]=useState({date:new Date().toISOString().slice(0,10),fortnight:1,month:defaultMonth,category:categories[0]?.name||'Miscellaneous',description:'',amount:''});
 const submit=(e)=>{e.preventDefault(); if(!form.description||!form.amount)return; onSave({...form,amount:Number(form.amount),fortnight:Number(form.fortnight)});};
 return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><button type="button" className="close" onClick={onClose}>×</button><div className="eyebrow">NEW TRANSACTION</div><h2>Add an expense</h2><p>Keep it simple. Date, category, description and amount.</p><label>Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><div className="form-grid"><label>Month<select value={form.month} onChange={e=>setForm({...form,month:e.target.value})}>{MONTHS.map(m=><option key={m}>{m}</option>)}</select></label><label>Fortnight<input type="number" min="1" value={form.fortnight} onChange={e=>setForm({...form,fortnight:e.target.value})}/></label></div><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c.name}>{c.name}</option>)}</select></label><label>Description<input autoFocus value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="e.g. Woolworths"/></label><label>Amount<input type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></label><button className="primary wide" type="submit">Save expense</button></form></div>
}

export default App;
