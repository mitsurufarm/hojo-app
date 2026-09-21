import { useEffect, useState, type FormEvent, type ReactNode, type HTMLInputTypeAttribute } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from '../auth/AuthContext'
import { authConfigured } from '../auth/cognito'
import { areas, crops, cultivations, fields, harvests, photos, workLogs } from '../api/resources'
import type { Area, Crop, Cultivation, Field, Harvest, Photo, WorkLog } from '../types'

const workTypes = ['播種', '定植', '整地', '間引き', '除草', '施肥', '防除', '水やり', '収穫', '片付け', '観察', 'その他']
const formatArea = (area?: number) => area === undefined ? '—' : `${area.toLocaleString()} m²（${area / 100}a）`
const errorMessage = (e: unknown) => e instanceof Error ? e.message : '予期しないエラーが発生しました。'

function AppLayout({ children }: { children: ReactNode }) { const { logout, userName } = useAuth(); return <div className="app-shell"><header><Link className="brand" to="/">MITSURU FARM <small>圃場記録</small></Link><nav><NavLink to="/">ホーム</NavLink><NavLink to="/fields">圃場</NavLink><NavLink to="/cultivations">栽培</NavLink><NavLink to="/crops">作物</NavLink></nav><button className="text-button" onClick={() => void logout()}>{userName || 'ログアウト'}</button></header><main>{children}</main><nav className="bottom-nav"><NavLink to="/">⌂<span>ホーム</span></NavLink><NavLink to="/fields">▦<span>圃場</span></NavLink><NavLink to="/cultivations">♧<span>栽培</span></NavLink><NavLink to="/crops">⚙<span>作物</span></NavLink></nav></div> }
function Protected({ children }: { children: ReactNode }) { const { loading, authenticated } = useAuth(); if (loading) return <Loading />; return authenticated ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" replace /> }
function Loading() { return <div className="loading">読み込み中…</div> }
function Page({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) { return <section className="page"><div className="page-head"><div><p className="eyebrow">MITSURU FARM</p><h1>{title}</h1></div>{action}</div>{children}</section> }
function Notice({ children }: { children: ReactNode }) { return <div className="notice">{children}</div> }
function Login() { const { authenticated, login } = useAuth(); if (authenticated) return <Navigate to="/" replace />; return <main className="login"><div className="login-card"><p className="eyebrow">FIELD RECORD</p><h1>MITSURU FARM</h1><p>圃場・栽培・作業・収穫をまとめて記録します。</p>{authConfigured ? <button className="primary" onClick={() => void login()}>Cognitoでログイン</button> : <Notice><strong>接続設定が未完了です。</strong><br />`app/.env.local` にCognitoとAPI Gatewayの公開設定値を入力してください。</Notice>}<a className="back-link" href="/">公開サイトへ戻る</a></div></main> }

function Home() { const [items, setItems] = useState<Cultivation[]>([]); const [error, setError] = useState(''); useEffect(() => { cultivations.current().then(v => setItems(v.items)).catch(e => setError(errorMessage(e))) }, []); return <Page title="ホーム" action={<Link className="primary button-link" to="/cultivations/new">＋ 栽培を登録</Link>}>{error && <Notice>{error}</Notice>}<h2>現在栽培中</h2>{items.length ? <div className="card-grid">{items.map(c => <CultivationCard key={c.cultivationId} item={c} />)}</div> : <Empty text="現在栽培中の作物はありません。" />}<section className="quick"><h2>クイック操作</h2><div><Link to="/cultivations">栽培を見る</Link><Link to="/fields">圃場を管理</Link><Link to="/crops">作物を管理</Link></div></section></Page> }
function Empty({ text }: { text: string }) { return <div className="empty">{text}</div> }
function CultivationCard({ item }: { item: Cultivation }) { return <Link className="card" to={`/cultivations/${item.cultivationId}`}><span className={`badge ${item.status}`}>{statusLabel(item.status)}</span><h3>{item.cropName || item.cropId}</h3><p>{item.year}年 {item.season && `・${item.season}`}</p><p>{item.fieldName || item.fieldId} / {item.areaName || item.areaId}</p></Link> }
const statusLabel = (status: string) => ({ planned: '予定', growing: '栽培中', completed: '完了', failed: '中止', active: '使用中', inactive: '休止' } as Record<string, string>)[status] || status

function Fields() { const [items, setItems] = useState<Field[]>([]); const [error, setError] = useState(''); useEffect(() => { fields.list().then(v => setItems(v.items)).catch(e => setError(errorMessage(e))) }, []); return <Page title="圃場" action={<Link className="primary button-link" to="/fields/new">＋ 圃場を追加</Link>}>{error && <Notice>{error}</Notice>}<div className="card-grid">{items.map(f => <Link className="card" key={f.fieldId} to={`/fields/${f.fieldId}`}><span className="badge">{statusLabel(f.status)}</span><h3>{f.name}</h3><p>{formatArea(f.area)}</p><p>{f.location || '所在地未登録'}</p></Link>)}</div>{!items.length && !error && <Empty text="圃場がありません。最初の圃場を追加してください。" />}</Page> }
function FieldDetail() { const { fieldId = '' } = useParams(); const [field, setField] = useState<Field>(); const [items, setItems] = useState<Area[]>([]); const [error, setError] = useState(''); useEffect(() => { Promise.all([fields.get(fieldId), areas.list(fieldId)]).then(([f, a]) => { setField(f); setItems(a.items) }).catch(e => setError(errorMessage(e))) }, [fieldId]); if (error) return <Page title="圃場"><Notice>{error}</Notice></Page>; if (!field) return <Loading />; return <Page title={field.name} action={<Link className="secondary button-link" to={`/fields/${fieldId}/edit`}>編集</Link>}><div className="details"><p><b>面積</b>{formatArea(field.area)}</p><p><b>所在地</b>{field.location || '—'}</p><p><b>土質 / 排水性 / 日当たり</b>{[field.soilType, field.drainage, field.sunlight].filter(Boolean).join(' / ') || '—'}</p><p><b>備考</b>{field.note || '—'}</p></div><div className="section-head"><h2>エリア</h2><Link to={`/fields/${fieldId}/areas/new`}>＋ 追加</Link></div><div className="list">{items.map(a => <Link key={a.areaId} className="list-row" to={`/fields/${fieldId}/areas/${a.areaId}`}><span><b>{a.name}</b><small>{formatArea(a.areaSize)} ・ {statusLabel(a.status)}</small></span><span>›</span></Link>)}</div>{!items.length && <Empty text="エリアがありません。" />}</Page> }
function AreaDetail() { const { fieldId = '', areaId = '' } = useParams(); const [area, setArea] = useState<Area>(); const [items, setItems] = useState<Cultivation[]>([]); const [error, setError] = useState(''); useEffect(() => { Promise.all([areas.get(fieldId, areaId), areas.cultivations(fieldId, areaId)]).then(([a, c]) => { setArea(a); setItems(c.items) }).catch(e => setError(errorMessage(e))) }, [fieldId, areaId]); if (error) return <Page title="エリア"><Notice>{error}</Notice></Page>; if (!area) return <Loading />; return <Page title={area.name} action={<Link className="secondary button-link" to={`/fields/${fieldId}/areas/${areaId}/edit`}>編集</Link>}><div className="details"><p><b>面積</b>{formatArea(area.areaSize)}</p><p><b>位置</b>{area.position || '—'}</p><p><b>状態</b>{statusLabel(area.status)}</p><p><b>備考</b>{area.note || '—'}</p></div><div className="section-head"><h2>栽培履歴</h2><Link to={`/cultivations/new?fieldId=${fieldId}&areaId=${areaId}`}>＋ 栽培を追加</Link></div>{items.map(c => <CultivationCard key={c.cultivationId} item={c} />)}{!items.length && <Empty text="栽培履歴がありません。" />}</Page> }

function Cultivations() { const [items, setItems] = useState<Cultivation[]>([]); const [error, setError] = useState(''); useEffect(() => { cultivations.list().then(v => setItems(v.items)).catch(e => setError(errorMessage(e))) }, []); return <Page title="栽培" action={<Link className="primary button-link" to="/cultivations/new">＋ 栽培を登録</Link>}>{error && <Notice>{error}</Notice>}<div className="card-grid">{items.map(c => <CultivationCard key={c.cultivationId} item={c} />)}</div>{!items.length && !error && <Empty text="栽培記録がありません。" />}</Page> }
function CultivationDetail() { const { cultivationId = '' } = useParams(); const [item, setItem] = useState<Cultivation>(); const [error, setError] = useState(''); useEffect(() => { cultivations.get(cultivationId).then(setItem).catch(e => setError(errorMessage(e))) }, [cultivationId]); if (error) return <Page title="栽培"><Notice>{error}</Notice></Page>; if (!item) return <Loading />; return <Page title={item.cropName || item.cropId} action={<Link className="secondary button-link" to={`/cultivations/${cultivationId}/edit`}>編集</Link>}><p className={`badge ${item.status}`}>{statusLabel(item.status)}</p><div className="details"><p><b>栽培ID</b>{item.cultivationId}</p><p><b>圃場 / エリア</b>{item.fieldName || item.fieldId} / {item.areaName || item.areaId}</p><p><b>年度 / 品種 / 季節</b>{item.year}年 / {item.variety || '—'} / {item.season || '—'}</p><p><b>播種 / 定植</b>{item.sowingDate || '—'} / {item.plantingDate || '—'}</p><p><b>備考</b>{item.note || '—'}</p></div><div className="quick record-actions"><Link to={`/cultivations/${cultivationId}/work-logs/new`}>＋ 作業</Link><Link to={`/cultivations/${cultivationId}/harvests/new`}>＋ 収穫</Link><Link to={`/cultivations/${cultivationId}/photos/new`}>＋ 写真</Link></div><div className="tabs"><Link to={`/cultivations/${cultivationId}/work-logs`}>作業</Link><Link to={`/cultivations/${cultivationId}/harvests`}>収穫</Link><Link to={`/cultivations/${cultivationId}/photos`}>写真</Link></div></Page> }

type Kind = 'field' | 'area' | 'crop' | 'cultivation' | 'work' | 'harvest'
const fieldDefs: Record<Kind, [string, string, string?][]> = { field: [['name', '圃場名', 'text'], ['area', '面積（m²）', 'number'], ['location', '所在地'], ['soilType', '土質'], ['drainage', '排水性'], ['sunlight', '日当たり'], ['status', '状態', 'select'], ['note', '備考', 'textarea']], area: [['name', 'エリア名'], ['areaSize', '面積（m²）', 'number'], ['position', '圃場内の位置'], ['status', '状態', 'select'], ['note', '備考', 'textarea']], crop: [['name', '作物名'], ['category', 'カテゴリ'], ['active', '利用状態', 'boolean'], ['note', '備考', 'textarea']], cultivation: [['fieldId', '圃場ID'], ['areaId', 'エリアID'], ['cropId', '作物ID'], ['year', '栽培年度', 'number'], ['variety', '品種'], ['season', '季節'], ['sowingDate', '播種日', 'date'], ['plantingDate', '定植日', 'date'], ['harvestStartDate', '収穫開始日', 'date'], ['harvestEndDate', '収穫終了日', 'date'], ['completedDate', '完了日', 'date'], ['status', '状態', 'cultivationStatus'], ['note', '備考', 'textarea']], work: [['date', '作業日', 'date'], ['workType', '作業種別', 'workType'], ['description', '作業内容', 'textarea'], ['workMinutes', '作業時間（分）', 'number'], ['workerCount', '作業人数', 'number'], ['weather', '天候'], ['temperature', '気温（℃）', 'number'], ['soilCondition', '土壌状態'], ['beforeCondition', '作業前の状態'], ['afterCondition', '作業後の状態'], ['note', '備考', 'textarea']], harvest: [['harvestDate', '収穫日', 'date'], ['quantity', '収穫量', 'number'], ['unit', '単位'], ['saleQuantity', '販売量', 'number'], ['selfConsumptionQuantity', '自家消費量', 'number'], ['discardQuantity', '廃棄量', 'number'], ['sales', '売上（円）', 'number'], ['salesChannel', '販路'], ['note', '備考', 'textarea']] }
function FormPage({ kind }: { kind: Kind }) {
  const p = useParams();
  const navigate = useNavigate();
  const id = kind === 'field' ? p.fieldId : kind === 'area' ? p.areaId : kind === 'crop' ? p.cropId : kind === 'cultivation' ? p.cultivationId : kind === 'work' ? p.workLogId : p.harvestId;
  const parent = kind === 'area' ? p.fieldId : ['work', 'harvest'].includes(kind) ? p.cultivationId : undefined;
  const [values, setValues] = useState<Record<string, unknown>>(kind === 'crop' ? { active: true } : { status: kind === 'cultivation' ? 'planned' : 'active' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const get = kind === 'field' ? fields.get(id) : kind === 'area' ? areas.get(parent!, id) : kind === 'crop' ? crops.get(id) : kind === 'cultivation' ? cultivations.get(id) : kind === 'work' ? workLogs.get(parent!, id) : harvests.get(parent!, id);
    get.then((x: unknown) => setValues(x as unknown as Record<string, unknown>)).catch(e => setError(errorMessage(e)))
  }, [id, kind, parent]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, ['area', 'areaSize', 'year', 'workMinutes', 'workerCount', 'temperature', 'quantity', 'saleQuantity', 'selfConsumptionQuantity', 'discardQuantity', 'sales'].includes(k) && v !== '' ? Number(v) : v]));
      if (id) {
        if (kind === 'field') await fields.update(id, data);
        else if (kind === 'area') await areas.update(parent!, id, data);
        else if (kind === 'crop') await crops.update(id, data);
        else if (kind === 'cultivation') await cultivations.update(id, data);
        else if (kind === 'work') await workLogs.update(parent!, id, data);
        else await harvests.update(parent!, id, data)
      } else {
        if (kind === 'field') await fields.create(data);
        else if (kind === 'area') await areas.create(parent!, data);
        else if (kind === 'crop') await crops.create(data);
        else if (kind === 'cultivation') await cultivations.create(data);
        else if (kind === 'work') await workLogs.create(parent!, data);
        else await harvests.create(parent!, data)
      }
      navigate(kind === 'area' ? `/fields/${parent}` : ['work', 'harvest'].includes(kind) ? `/cultivations/${parent}` : kind === 'field' ? '/fields' : kind === 'crop' ? '/crops' : '/cultivations')
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false)
    }
  };

  return <Page title={`${id ? '編集' : '登録'}：${{ field: '圃場', area: 'エリア', crop: '作物', cultivation: '栽培', work: '作業', harvest: '収穫' }[kind]}`}><form className="form" onSubmit={submit}>{fieldDefs[kind].map(([key, label, type]) => <FormControl key={key} label={label} name={key} type={type} value={values[key]} onChange={v => setValues(x => ({ ...x, [key]: v }))} />)}{error && <Notice>{error}</Notice>}<button className="primary" disabled={saving}>{saving ? '保存中…' : '保存する'}</button></form></Page>
}
function FormControl({ label, name, type = 'text', value, onChange }: { label: string; name: string; type?: string; value: unknown; onChange: (v: string | boolean) => void }) { if (type === 'textarea') return <label>{label}<textarea value={String(value ?? '')} onChange={e => onChange(e.target.value)} /></label>; if (type === 'boolean') return <label className="check"><input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} />利用可能にする</label>; if (type === 'select' || type === 'cultivationStatus' || type === 'workType') { const options = type === 'cultivationStatus' ? [['planned', '予定'], ['growing', '栽培中'], ['completed', '完了'], ['failed', '中止']] : type === 'workType' ? workTypes.map(v => [v, v]) : [['active', '使用中'], ['inactive', '休止']]; return <label>{label}<select value={String(value ?? '')} onChange={e => onChange(e.target.value)}>{options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label> } return <label>{label}<input name={name} type={type as HTMLInputTypeAttribute} value={String(value ?? '')} onChange={e => onChange(e.target.value)} required={['name', 'area', 'areaSize', 'fieldId', 'areaId', 'cropId', 'year', 'date', 'workType', 'quantity', 'unit', 'harvestDate'].includes(name)} /></label> }

function Crops() { const [items, setItems] = useState<Crop[]>([]); const [error, setError] = useState(''); useEffect(() => { crops.list().then(v => setItems(v.items)).catch(e => setError(errorMessage(e))) }, []); return <Page title="作物" action={<Link className="primary button-link" to="/crops/new">＋ 作物を追加</Link>}>{error && <Notice>{error}</Notice>}<div className="list">{items.map(c => <Link className="list-row" key={c.cropId} to={`/crops/${c.cropId}/edit`}><span><b>{c.name}</b><small>{c.category || '未分類'} ・ {c.active ? '利用中' : '利用停止'}</small></span><span>›</span></Link>)}</div>{!items.length && !error && <Empty text="作物がありません。" />}</Page> }
function RecordList({ type }: { type: 'work' | 'harvest' }) { const { cultivationId = '' } = useParams(); const [items, setItems] = useState<(WorkLog | Harvest)[]>([]); const [error, setError] = useState(''); useEffect(() => { (type === 'work' ? workLogs.list(cultivationId) : harvests.list(cultivationId)).then(v => setItems(v.items)).catch(e => setError(errorMessage(e))) }, [cultivationId, type]); const label = type === 'work' ? '作業' : '収穫'; return <Page title={label} action={<Link className="primary button-link" to={`/cultivations/${cultivationId}/${type === 'work' ? 'work-logs' : 'harvests'}/new`}>＋ {label}を追加</Link>}>{error && <Notice>{error}</Notice>}<div className="list">{items.map(item => { const work = type === 'work'; const id = work ? (item as WorkLog).workLogId : (item as Harvest).harvestId; const date = work ? (item as WorkLog).date : (item as Harvest).harvestDate; return <Link className="list-row" key={id} to={`/cultivations/${cultivationId}/${work ? 'work-logs' : 'harvests'}/${id}/edit`}><span><b>{date}　{work ? (item as WorkLog).workType : `${(item as Harvest).quantity} ${(item as Harvest).unit}`}</b><small>{work ? (item as WorkLog).description || '内容未入力' : `販売 ${(item as Harvest).saleQuantity ?? 0} ${(item as Harvest).unit}`}</small></span><span>›</span></Link> })}</div>{!items.length && !error && <Empty text={`${label}記録がありません。`} />}</Page> }
function Photos() { const { cultivationId = '' } = useParams(); const [items, setItems] = useState<Photo[]>([]); const [error, setError] = useState(''); useEffect(() => { photos.list(cultivationId).then(v => setItems(v.items)).catch(e => setError(errorMessage(e))) }, [cultivationId]); return <Page title="写真" action={<Link className="primary button-link" to={`/cultivations/${cultivationId}/photos/new`}>＋ 写真を追加</Link>}>{error && <Notice>{error}</Notice>}<div className="photo-grid">{items.map(p => <figure key={p.photoId}>{p.url ? <img src={p.url} alt={p.caption || '栽培写真'} /> : <div className="photo-placeholder">写真</div>}<figcaption>{p.caption || '説明なし'}</figcaption></figure>)}</div>{!items.length && !error && <Empty text="写真がありません。" />}</Page> }
function PhotoUpload() { const { cultivationId = '' } = useParams(); const navigate = useNavigate(); const [file, setFile] = useState<File>(); const [caption, setCaption] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const submit = async (e: FormEvent) => { e.preventDefault(); if (!file) return setError('写真を選択してください。'); if (file.size > 3 * 1024 * 1024) return setError('写真は3MB以下にしてください。'); setSaving(true); try { const form = new FormData(); form.append('file', file); form.append('caption', caption); await photos.upload(cultivationId, form); navigate(`/cultivations/${cultivationId}/photos`) } catch (e) { setError(errorMessage(e)); setSaving(false) } }; return <Page title="写真を追加"><form className="form" onSubmit={submit}><label>写真ファイル<input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0])} /></label><label>キャプション<input value={caption} onChange={e => setCaption(e.target.value)} /></label><p className="hint">最大3MB。Dropboxの認証情報はブラウザには保存されません。</p>{error && <Notice>{error}</Notice>}<button className="primary" disabled={saving}>{saving ? 'アップロード中…' : 'アップロード'}</button></form></Page> }
function NotFound() { return <Page title="ページが見つかりません"><Link to="/">ホームへ戻る</Link></Page> }
function RoutesView() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="*"
        element={
          <Protected>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/fields" element={<Fields />} />
              <Route path="/fields/new" element={<FormPage kind="field" />} />
              <Route path="/fields/:fieldId" element={<FieldDetail />} />
              <Route path="/fields/:fieldId/edit" element={<FormPage kind="field" />} />
              <Route path="/fields/:fieldId/areas/new" element={<FormPage kind="area" />} />
              <Route path="/fields/:fieldId/areas/:areaId" element={<AreaDetail />} />
              <Route path="/fields/:fieldId/areas/:areaId/edit" element={<FormPage kind="area" />} />
              <Route path="/cultivations" element={<Cultivations />} />
              <Route path="/cultivations/new" element={<FormPage kind="cultivation" />} />
              <Route path="/cultivations/:cultivationId" element={<CultivationDetail />} />
              <Route path="/cultivations/:cultivationId/edit" element={<FormPage kind="cultivation" />} />
              <Route path="/cultivations/:cultivationId/work-logs" element={<RecordList type="work" />} />
              <Route path="/cultivations/:cultivationId/work-logs/new" element={<FormPage kind="work" />} />
              <Route path="/cultivations/:cultivationId/work-logs/:workLogId/edit" element={<FormPage kind="work" />} />
              <Route path="/cultivations/:cultivationId/harvests" element={<RecordList type="harvest" />} />
              <Route path="/cultivations/:cultivationId/harvests/new" element={<FormPage kind="harvest" />} />
              <Route path="/cultivations/:cultivationId/harvests/:harvestId/edit" element={<FormPage kind="harvest" />} />
              <Route path="/cultivations/:cultivationId/photos" element={<Photos />} />
              <Route path="/cultivations/:cultivationId/photos/new" element={<PhotoUpload />} />
              <Route path="/crops" element={<Crops />} />
              <Route path="/crops/new" element={<FormPage kind="crop" />} />
              <Route path="/crops/:cropId/edit" element={<FormPage kind="crop" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Protected>
        }
      />
    </Routes>
  )
}

export function App() {
  const restored = new URLSearchParams(window.location.search).get('redirect')
  return <AuthProvider>{restored?.startsWith('/') ? <Navigate to={restored} replace /> : <RoutesView />}</AuthProvider>
}
