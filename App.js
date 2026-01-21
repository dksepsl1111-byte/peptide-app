import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingDown, Syringe, BarChart3, Package, Plus, Trash2, Settings } from 'lucide-react';

const PEPTIDES = {
  mounjaro: { id: 'mounjaro', name: '마운자로', color: '#3b82f6', defaultCycle: 7, doses: [2.5, 5, 7.5, 10, 12.5, 15], vialSizes: [50, 60, 80] },
  tesamorelin: { id: 'tesamorelin', name: '테사모렐린', color: '#10b981', defaultCycle: 1, doses: [1, 2], vialSizes: [2, 5, 10] },
  retatrutide: { id: 'retatrutide', name: '레타트루타이드', color: '#f59e0b', defaultCycle: 7, doses: [1, 2, 3, 4, 5, 6, 7, 8], vialSizes: [10, 30], customVial: true }
};

export default function PeptideTracker() {
  const [activeTab, setActiveTab] = useState('record');
  const [injections, setInjections] = useState([]);
  const [weights, setWeights] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [cycles, setCycles] = useState({});
  const [targetWeight, setTargetWeight] = useState('');
  const [showTargetInput, setShowTargetInput] = useState(false);
  const [tempTarget, setTempTarget] = useState('');
  const [showCycleSettings, setShowCycleSettings] = useState(false);
  
  const [newInjection, setNewInjection] = useState({ date: new Date().toISOString().split('T')[0], peptide: 'mounjaro', dose: 2.5, vialId: null });
  const [newWeight, setNewWeight] = useState({ date: new Date().toISOString().split('T')[0], weight: '' });
  const [newVial, setNewVial] = useState({ peptide: 'mounjaro', size: 60, customSize: '' });
  const [editingVial, setEditingVial] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await window.storage.get('peptide_data');
        if (result && result.value) {
          const data = JSON.parse(result.value);
          setInjections(data.injections || []);
          setWeights(data.weights || []);
          setInventory(data.inventory || []);
          setCycles(data.cycles || {});
          setTargetWeight(data.targetWeight || '');
        }
      } catch (error) {
        console.log('데이터 로드 중 오류:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        await window.storage.set('peptide_data', JSON.stringify({ 
          injections, 
          weights, 
          inventory, 
          cycles, 
          targetWeight 
        }));
      } catch (error) {
        console.error('데이터 저장 중 오류:', error);
      }
    };
    saveData();
  }, [injections, weights, inventory, cycles, targetWeight]);

  const addVial = () => {
    const size = newVial.peptide === 'retatrutide' && newVial.customSize ? parseFloat(newVial.customSize) : newVial.size;
    if (size > 0) {
      setInventory([...inventory, { id: Date.now(), peptide: newVial.peptide, totalSize: size, remaining: size, addedDate: new Date().toISOString().split('T')[0] }]);
      setNewVial({ peptide: 'mounjaro', size: 60, customSize: '' });
    }
  };

  const addInjection = () => {
    if (!newInjection.vialId) return alert('사용할 주사기를 선택해주세요.');
    const vial = inventory.find(v => v.id === newInjection.vialId);
    if (!vial || vial.remaining < newInjection.dose) return alert('주사기의 남은 용량이 부족합니다.');
    
    setInjections([...injections, { ...newInjection, dose: parseFloat(newInjection.dose), id: Date.now() }].sort((a, b) => new Date(a.date) - new Date(b.date)));
    setInventory(inventory.map(v => v.id === newInjection.vialId ? { ...v, remaining: v.remaining - newInjection.dose } : v));
    setNewInjection({ date: new Date().toISOString().split('T')[0], peptide: newInjection.peptide, dose: PEPTIDES[newInjection.peptide].doses[0], vialId: newInjection.vialId });
  };

  const deleteInjection = (inj) => {
    const vial = inventory.find(v => v.id === inj.vialId);
    if (vial) {
      setInventory(inventory.map(v => v.id === inj.vialId ? { ...v, remaining: v.remaining + inj.dose } : v));
    }
    setInjections(injections.filter(i => i.id !== inj.id));
  };

  const addWeight = () => {
    if (newWeight.weight) {
      setWeights([...weights, { ...newWeight, weight: parseFloat(newWeight.weight), id: Date.now() }].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setNewWeight({ date: new Date().toISOString().split('T')[0], weight: '' });
    }
  };

  const deleteWeight = (id) => {
    setWeights(weights.filter(w => w.id !== id));
  };

  const saveVialEdit = (vialId, newRemaining) => {
    const vial = inventory.find(v => v.id === vialId);
    if (vial && newRemaining >= 0 && newRemaining <= vial.totalSize) {
      setInventory(inventory.map(v => v.id === vialId ? { ...v, remaining: parseFloat(newRemaining) } : v));
      setEditingVial(null);
    }
  };

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
  const currentWeight = weights.length > 0 ? weights[weights.length - 1].weight : null;
  const startWeight = weights.length > 0 ? weights[0].weight : null;
  const progress = targetWeight && currentWeight && startWeight ? ((startWeight - currentWeight) / (startWeight - parseFloat(targetWeight)) * 100) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Syringe className="text-blue-600" />
            펩타이드 주사 복약일지
          </h1>
          <p className="text-gray-600">다이어트 펩타이드 주사 관리 및 체중 추적</p>
        </div>

        {Object.keys(nextInjections).length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Calendar size={20} />
                다음 주사 일정
              </h3>
              <button onClick={() => setShowCycleSettings(!showCycleSettings)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-semibold flex items-center gap-2">
                <Settings size={16} />
                주기 설정
              </button>
            </div>

            {showCycleSettings && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold mb-3 text-gray-800">펩타이드 주기 설정 (일)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.values(PEPTIDES).map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: p.color}}></div>
                      <span className="flex-1">{p.name}</span>
                      <input type="number" min="1" value={cycles[p.id] || p.defaultCycle} onChange={(e) => setCycles({...cycles, [p.id]: parseInt(e.target.value)})} className="w-16 px-2 py-1 border rounded text-center" />
                      <span className="text-sm text-gray-600">일</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(nextInjections).map(({daysUntil, date, peptide}) => (
                <div key={peptide.id} className={`rounded-xl shadow-lg p-5 ${daysUntil <= 0 ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' : daysUntil <= 3 ? 'bg-gradient-to-r from-orange-400 to-yellow-400 text-white' : 'bg-gradient-to-r from-blue-400 to-indigo-400 text-white'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                    <h4 className="font-semibold text-lg">{peptide.name}</h4>
                  </div>
                  <div className="text-3xl font-bold mb-2">{daysUntil <= 0 ? '오늘!' : `${daysUntil}일 후`}</div>
                  <div className="text-sm opacity-90">{date.toLocaleDateString('ko-KR', {month: 'long', day: 'numeric', weekday: 'short'})}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b overflow-x-auto">
            {[{id: 'inventory', icon: Package, label: '재고 관리'}, {id: 'record', icon: Calendar, label: '기록 입력'}, {id: 'weight', icon: TrendingDown, label: '체중 변화'}, {id: 'concentration', icon: BarChart3, label: '체내 농도'}].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="inline mr-2" size={20} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="bg-purple-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">주사기 추가</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select value={newVial.peptide} onChange={(e) => setNewVial({peptide: e.target.value, size: PEPTIDES[e.target.value].vialSizes[0], customSize: ''})} className="px-4 py-2 border rounded-lg">
                      {Object.values(PEPTIDES).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    
                    {PEPTIDES[newVial.peptide].customVial ? (
                      <>
                        <select value={newVial.size} onChange={(e) => setNewVial({...newVial, size: e.target.value === 'custom' ? 'custom' : parseInt(e.target.value), customSize: ''})} className="px-4 py-2 border rounded-lg">
                          {PEPTIDES[newVial.peptide].vialSizes.map(s => <option key={s} value={s}>{s}mg</option>)}
                          <option value="custom">커스텀</option>
                        </select>
                        {newVial.size === 'custom' && <input type="number" step="0.1" placeholder="커스텀 용량 (mg)" value={newVial.customSize} onChange={(e) => setNewVial({...newVial, customSize: e.target.value})} className="px-4 py-2 border rounded-lg" />}
                      </>
                    ) : (
                      <select value={newVial.size} onChange={(e) => setNewVial({...newVial, size: parseInt(e.target.value)})} className="px-4 py-2 border rounded-lg">
                        {PEPTIDES[newVial.peptide].vialSizes.map(s => <option key={s} value={s}>{s}mg</option>)}
                      </select>
                    )}
                    
                    <button onClick={addVial} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center justify-center gap-2">
                      <Plus size={20} />추가
                    </button>
                  </div>
                </div>

                {inventory.length > 0 ? (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-gray-800">보유 중인 주사기</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {inventory.map(v => {
                          const p = PEPTIDES[v.peptide];
                          const pct = (v.remaining / v.totalSize) * 100;
                          const isEditing = editingVial === v.id;
                          return (
                            <div key={v.id} className="bg-white border-2 rounded-lg p-4 shadow-sm">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: p.color}}></div>
                                    <span className="font-semibold">{p.name}</span>
                                  </div>
                                  <div className="text-sm text-gray-600">추가일: {v.addedDate}</div>
                                </div>
                                <button onClick={() => setInventory(inventory.filter(i => i.id !== v.id))} className="text-red-500 hover:text-red-700">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                              <div className="mb-2">
                                <div className="flex justify-between text-sm mb-1">
                                  <span>남은 용량</span>
                                  {isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="number" 
                                        step="0.1" 
                                        defaultValue={v.remaining.toFixed(1)}
                                        onBlur={(e) => saveVialEdit(v.id, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveVialEdit(v.id, e.target.value);
                                          if (e.key === 'Escape') setEditingVial(null);
                                        }}
                                        className="w-20 px-2 py-1 border rounded text-center text-xs"
                                        autoFocus
                                      />
                                      <span className="text-xs">/ {v.totalSize}mg</span>
                                    </div>
                                  ) : (
                                    <span 
                                      className="font-semibold cursor-pointer hover:text-blue-600" 
                                      onClick={() => setEditingVial(v.id)}
                                    >
                                      {v.remaining.toFixed(1)}mg / {v.totalSize}mg
                                    </span>
                                  )}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div className="h-2 rounded-full transition-all" style={{width: `${pct}%`, backgroundColor: pct > 30 ? p.color : '#ef4444'}}></div>
                                </div>
                              </div>
                              {pct < 30 && <div className="text-xs text-red-600 mt-2">⚠️ 용량이 부족합니다</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-gray-800">펩타이드별 총 재고</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.values(PEPTIDES).map(p => {
                          const total = inventory.filter(v => v.peptide === p.id).reduce((s, v) => s + v.remaining, 0);
                          if (total === 0) return null;
                          return (
                            <div key={p.id} className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full" style={{backgroundColor: p.color}}></div>
                                <span className="font-semibold">{p.name}</span>
                              </div>
                              <div className="text-2xl font-bold" style={{color: p.color}}>{total.toFixed(1)}mg</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">보유 중인 주사기가 없습니다.</div>
                )}
              </div>
            )}

            {activeTab === 'record' && (
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">주사 기록 추가</h3>
                  {availableVials.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">
                      <Package className="mx-auto mb-2 text-gray-400" size={48} />
                      <p>사용 가능한 {PEPTIDES[newInjection.peptide].name} 주사기가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="date" value={newInjection.date} onChange={(e) => setNewInjection({...newInjection, date: e.target.value})} className="px-4 py-2 border rounded-lg" />
                        <select value={newInjection.peptide} onChange={(e) => setNewInjection({...newInjection, peptide: e.target.value, dose: PEPTIDES[e.target.value].doses[0], vialId: null})} className="px-4 py-2 border rounded-lg">
                          {Object.values(PEPTIDES).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select value={newInjection.dose} onChange={(e) => setNewInjection({...newInjection, dose: parseFloat(e.target.value)})} className="px-4 py-2 border rounded-lg">
                          {PEPTIDES[newInjection.peptide].doses.map(d => <option key={d} value={d}>{d}mg</option>)}
                        </select>
                        <select value={newInjection.vialId || ''} onChange={(e) => setNewInjection({...newInjection, vialId: parseInt(e.target.value)})} className="px-4 py-2 border rounded-lg">
                          <option value="">사용할 주사기 선택</option>
                          {availableVials.map(v => <option key={v.id} value={v.id}>{v.totalSize}mg 주사기 (남은: {v.remaining.toFixed(1)}mg)</option>)}
                        </select>
                      </div>
                      <button onClick={addInjection} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">주사 기록 추가</button>
                    </div>
                  )}
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">체중 기록 추가</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="date" value={newWeight.date} onChange={(e) => setNewWeight({...newWeight, date: e.target.value})} className="px-4 py-2 border rounded-lg" />
                    <input type="number" step="0.1" placeholder="체중 (kg)" value={newWeight.weight} onChange={(e) => setNewWeight({...newWeight, weight: e.target.value})} className="px-4 py-2 border rounded-lg" />
                    <button onClick={addWeight} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">추가</button>
                  </div>
                </div>

                {injections.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">주사 기록</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {injections.slice().reverse().map(inj => {
                        const p = PEPTIDES[inj.peptide];
                        return (
                          <div key={inj.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{backgroundColor: p.color}}></div>
                              <span className="font-medium">{p.name}</span>
                              <span className="text-gray-600">{inj.dose}mg</span>
                              <span className="text-gray-500">{inj.date}</span>
                            </div>
                            <button onClick={() => deleteInjection(inj)} className="text-red-500 hover:text-red-700">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'weight' && (
              <div>
                <div className="mb-6">
                  {!showTargetInput ? (
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">체중 변화 추이</h3>
                      <button onClick={() => { setShowTargetInput(true); setTempTarget(targetWeight); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold">
                        {targetWeight ? '목표 체중 수정' : '목표 체중 설정'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-green-50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold mb-3 text-gray-800">목표 체중 설정</h4>
                      <div className="flex gap-3">
                        <input type="number" step="0.1" placeholder="목표 체중 (kg)" value={tempTarget} onChange={(e) => setTempTarget(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg" />
                        <button onClick={() => { if (tempTarget) { setTargetWeight(tempTarget); setShowTargetInput(false); }}} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">설정</button>
                        <button onClick={() => setShowTargetInput(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">취소</button>
                      </div>
                    </div>
                  )}

                  {targetWeight && currentWeight && (
                    <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl shadow-lg p-6 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <TrendingDown size={24} />
                          <h3 className="text-lg font-semibold">목표 달성률</h3>
                        </div>
                        <button onClick={() => setTargetWeight('')} className="text-white/80 hover:text-white text-sm">✕</button>
                      </div>
                      <div className="text-3xl font-bold mb-3">{Math.min(Math.max(progress, 0), 100).toFixed(1)}%</div>
                      <div className="bg-white/30 rounded-full h-3 mb-2">
                        <div className="bg-white rounded-full h-3 transition-all duration-500" style={{width: `${Math.min(Math.max(progress, 0), 100)}%`}}></div>
                      </div>
                      <div className="text-sm opacity-90">현재: {currentWeight}kg → 목표: {targetWeight}kg (남은 거리: {Math.abs(currentWeight - parseFloat(targetWeight)).toFixed(1)}kg)</div>
                    </div>
                  )}
                </div>

                {weights.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weights.map(w => ({date: w.date, weight: w.weight}))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} name="체중 (kg)" dot={{fill: '#10b981', r: 4}} />
                        {targetWeight && <Line type="monotone" dataKey={() => parseFloat(targetWeight)} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="목표 체중" dot={false} />}
                      </LineChart>
                    </ResponsiveContainer>
                    
                    <div className="mt-6 mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-gray-800">체중 기록</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {weights.slice().reverse().map(w => (
                          <div key={w.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{w.weight}kg</span>
                              <span className="text-gray-500">{w.date}</span>
                            </div>
                            <button onClick={() => deleteWeight(w.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">시작 체중</div>
                        <div className="text-2xl font-bold text-green-600">{weights[0].weight}kg</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">현재 체중</div>
                        <div className="text-2xl font-bold text-blue-600">{weights[weights.length - 1].weight}kg</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">변화량</div>
                        <div className="text-2xl font-bold text-purple-600">{(weights[weights.length - 1].weight - weights[0].weight).toFixed(1)}kg</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">변화율</div>
                        <div className="text-2xl font-bold text-orange-600">{((weights[weights.length - 1].weight - weights[0].weight) / weights[0].weight * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">체중 기록이 없습니다.</div>
                )}
              </div>
            )}

            {activeTab === 'concentration' && (
              <div className="text-center py-12 text-gray-500">체내 농도 기능은 현재 개발 중입니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
