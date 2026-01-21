const { useState, useEffect } = React;
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;
const { Calendar, TrendingDown, Syringe, BarChart3, Package, Plus, Trash2, Settings } = lucide-react;

[cite_start]// 펩타이드 설정 [cite: 3]
const PEPTIDES = {
  mounjaro: { id: 'mounjaro', name: '마운자로', color: '#3b82f6', defaultCycle: 7, doses: [2.5, 5, 7.5, 10, 12.5, 15], vialSizes: [50, 60, 80] },
  tesamorelin: { id: 'tesamorelin', name: '테사모렐린', color: '#10b981', defaultCycle: 1, doses: [1, 2], vialSizes: [2, 5, 10] },
  retatrutide: { id: 'retatrutide', name: '레타트루타이드', color: '#f59e0b', defaultCycle: 7, doses: [1, 2, 3, 4, 5, 6, 7, 8], vialSizes: [10, 30], customVial: true }
};

function PeptideTracker() {
  [cite_start]const [activeTab, setActiveTab] = useState('record'); [cite: 4]
  [cite_start]const [injections, setInjections] = useState([]); [cite: 4]
  [cite_start]const [weights, setWeights] = useState([]); [cite: 5]
  [cite_start]const [inventory, setInventory] = useState([]); [cite: 5]
  [cite_start]const [cycles, setCycles] = useState({}); [cite: 5]
  [cite_start]const [targetWeight, setTargetWeight] = useState(''); [cite: 5]
  [cite_start]const [showTargetInput, setShowTargetInput] = useState(false); [cite: 6]
  [cite_start]const [tempTarget, setTempTarget] = useState(''); [cite: 6]
  [cite_start]const [showCycleSettings, setShowCycleSettings] = useState(false); [cite: 6]

  [cite_start]// 입력 폼 상태 [cite: 7, 8, 9]
  const [newInjection, setNewInjection] = useState({ date: new Date().toISOString().split('T')[0], peptide: 'mounjaro', dose: 2.5, vialId: null });
  const [newWeight, setNewWeight] = useState({ date: new Date().toISOString().split('T')[0], weight: '' });
  const [newVial, setNewVial] = useState({ peptide: 'mounjaro', size: 60, customSize: '' });
  const [editingVial, setEditingVial] = useState(null);

  [cite_start]// 로컬 저장소 연동 [cite: 10, 11]
  useEffect(() => {
    const saved = localStorage.getItem('peptide_data');
    if (saved) {
      const data = JSON.parse(saved);
      setInjections(data.injections || []);
      setWeights(data.weights || []);
      setInventory(data.inventory || []);
      setCycles(data.cycles || {});
      setTargetWeight(data.targetWeight || '');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('peptide_data', JSON.stringify({ injections, weights, inventory, cycles, targetWeight }));
  }, [injections, weights, inventory, cycles, targetWeight]);

  [cite_start]// 주사기 추가 [cite: 12, 13, 14]
  const addVial = () => {
    const size = newVial.peptide === 'retatrutide' && newVial.customSize ? parseFloat(newVial.customSize) : newVial.size;
    if (size > 0) {
      setInventory([...inventory, { id: Date.now(), peptide: newVial.peptide, totalSize: size, remaining: size, addedDate: new Date().toISOString().split('T')[0] }]);
      setNewVial({ peptide: 'mounjaro', size: 60, customSize: '' });
    }
  };

  [cite_start]// 주사 기록 [cite: 15, 16, 17, 18, 19]
  const addInjection = () => {
    if (!newInjection.vialId) return alert('사용할 주사기를 선택해주세요.');
    const vial = inventory.find(v => v.id === newInjection.vialId);
    if (!vial || vial.remaining < newInjection.dose) return alert('주사기의 남은 용량이 부족합니다.');
    setInjections([...injections, { ...newInjection, dose: parseFloat(newInjection.dose), id: Date.now() }].sort((a, b) => new Date(a.date) - new Date(b.date)));
    setInventory(inventory.map(v => v.id === newInjection.vialId ? { ...v, remaining: v.remaining - newInjection.dose } : v));
  };

  [cite_start]// 체중 기록 [cite: 23, 24]
  const addWeight = () => {
    if (newWeight.weight) {
      setWeights([...weights, { ...newWeight, weight: parseFloat(newWeight.weight), id: Date.now() }].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setNewWeight({ date: new Date().toISOString().split('T')[0], weight: '' });
    }
  };

  [cite_start]// 일정 계산 [cite: 29, 30]
  const getNextInjections = () => {
    const next = {};
    Object.keys(PEPTIDES).forEach(pid => {
      const inj = injections.filter(i => i.peptide === pid);
      if (inj.length === 0) return;
      const last = inj[inj.length - 1];
      const cycle = cycles[pid] || PEPTIDES[pid].defaultCycle;
      const nextDate = new Date(last.date);
      nextDate.setDate(nextDate.getDate() + cycle);
      const days = Math.ceil((nextDate - new Date()) / 86400000);
      next[pid] = { date: nextDate, daysUntil: days, peptide: PEPTIDES[pid] };
    });
    return next;
  };

  const nextInjections = getNextInjections();
  const availableVials = inventory.filter(v => v.peptide === newInjection.peptide && v.remaining > 0);
  [cite_start]const currentWeight = weights.length > 0 ? weights[weights.length - 1].weight : null; [cite: 31]
  [cite_start]const startWeight = weights.length > 0 ? weights[0].weight : null; [cite: 32]
  const progress = targetWeight && currentWeight && startWeight ? ((startWeight - currentWeight) [cite_start]/ (startWeight - parseFloat(targetWeight)) * 100) : null; [cite: 33]

  return (
    <div className="min-h-screen bg-blue-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <header className="bg-white p-6 rounded-2xl shadow-sm text-center">
          <h1 className="text-xl font-bold flex justify-center items-center gap-2">
            <Syringe className="text-blue-500" /> 펩타이드 관리
          </h1>
        </header>

        {/* 대시보드 */}
        <div className="grid grid-cols-1 gap-3">
          {Object.values(nextInjections).map(({daysUntil, peptide}) => (
            <div key={peptide.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4" style={{borderLeftColor: peptide.color}}>
              <p className="text-sm text-gray-500">{peptide.name} 다음 주사</p>
              <h2 className="text-lg font-bold">{daysUntil <= 0 ? '오늘 맞으세요!' : `${daysUntil}일 남음`}</h2>
            </div>
          ))}
        </div>

        {/* 탭 전환 */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm">
          {['record', 'inventory', 'weight'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-bold ${activeTab === t ? 'bg-blue-500 text-white' : 'text-gray-400'}`}>
              {t === 'record' ? '기록' : t === 'inventory' ? '재고' : '체중'}
            </button>
          ))}
        </div>

        {/* 탭별 내용 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          {activeTab === 'record' && (
            <div className="space-y-4">
              <input type="date" value={newInjection.date} onChange={(e) => setNewInjection({...newInjection, date: e.target.value})} className="w-full border p-2 rounded" />
              <select value={newInjection.peptide} onChange={(e) => setNewInjection({...newInjection, peptide: e.target.value, vialId: null})} className="w-full border p-2 rounded">
                {Object.values(PEPTIDES).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={newInjection.vialId || ''} onChange={(e) => setNewInjection({...newInjection, vialId: parseInt(e.target.value)})} className="w-full border p-2 rounded">
                <option value="">주사기 선택</option>
                {availableVials.map(v => <option key={v.id} value={v.id}>{v.remaining.toFixed(1)}mg 남음</option>)}
              </select>
              <button onClick={addInjection} className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold">기록 추가</button>
            </div>
          )}
          
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <button onClick={addVial} className="w-full border-2 border-dashed p-4 rounded-xl text-gray-400 font-bold">+ 새 주사기 등록</button>
              {inventory.map(v => (
                <div key={v.id} className="border p-4 rounded-xl">
                  <div className="flex justify-between font-bold">
                    <span>{PEPTIDES[v.peptide].name}</span>
                    <span className="text-blue-500">{v.remaining.toFixed(1)}mg</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full mt-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{width: `${(v.remaining/v.totalSize)*100}%`}}></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'weight' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input type="number" placeholder="현재 체중" value={newWeight.weight} onChange={(e) => setNewWeight({...newWeight, weight: e.target.value})} className="flex-1 border p-2 rounded" />
                <button onClick={addWeight} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold">저장</button>
              </div>
              {weights.length > 0 && (
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <p className="text-sm text-gray-500">시작 대비 감량</p>
                  <h2 className="text-2xl font-bold text-green-600">{(weights[0].weight - currentWeight).toFixed(1)}kg</h2>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
