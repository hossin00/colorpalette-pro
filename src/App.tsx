import { useState } from 'react';
import { Palette, Copy, Check, Download, Plus, Trash2, RefreshCw, Heart, X } from 'lucide-react';

interface PaletteColor { hex: string; name: string; }
interface SavedPalette { id: string; name: string; colors: PaletteColor[]; createdAt: number; }

const SAVE = 'cp_palettes_v1';
const loadP = (): SavedPalette[] => { try { return JSON.parse(localStorage.getItem(SAVE)||'[]'); } catch { return []; } };

const hexToRgb = (hex: string) => ({ r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) });
const hexToHsl = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const rN=r/255, gN=g/255, bN=b/255;
  const max=Math.max(rN,gN,bN), min=Math.min(rN,gN,bN);
  let h=0, s=0;
  const l=(max+min)/2;
  if (max !== min) {
    const d=max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    if (max===rN) h=((gN-bN)/d+(gN<bN?6:0))/6;
    else if (max===gN) h=((bN-rN)/d+2)/6;
    else h=((rN-gN)/d+4)/6;
  }
  return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) };
};
const hslToHex = (h: number, s: number, l: number) => {
  const sN=s/100, lN=l/100;
  const a=sN*Math.min(lN,1-lN);
  const f = (n: number) => {
    const k=(n+h/30)%12;
    const c=lN-a*Math.max(-1,Math.min(k-3,9-k,1));
    return Math.round(255*c).toString(16).padStart(2,'0');
  };
  return '#'+f(0)+f(8)+f(4);
};
const getHarmonies = (hex: string): string[] => {
  const { h, s, l } = hexToHsl(hex);
  return [
    hslToHex((h+30)%360, s, l),
    hslToHex((h+60)%360, s, l),
    hslToHex((h+120)%360, s, l),
    hslToHex((h+180)%360, s, l),
  ];
};
const isLight = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.5;
};
const makeCSSVarName = (i: number) => i === 0 ? 'primary' : 'accent-' + i;

export default function App() {
  const [palettes,   setPalettes]   = useState<SavedPalette[]>(loadP);
  const [baseColor,  setBase]       = useState('#6366f1');
  const [swatches,   setSwatches]   = useState<PaletteColor[]>([
    { hex:'#6366f1', name:'Primary' },
    ...getHarmonies('#6366f1').map((h,i) => ({ hex:h, name:'Accent '+( i+1) }))
  ]);
  const [copied,     setCopied]     = useState('');
  const [palName,    setPalName]    = useState('');
  const [tab,        setTab]        = useState<'picker'|'saved'>('picker');

  const saveP = (items: SavedPalette[]) => { setPalettes(items); localStorage.setItem(SAVE, JSON.stringify(items)); };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const regenerate = () => {
    const h = Math.floor(Math.random() * 360);
    const hex = hslToHex(h, 65 + Math.random()*20, 45 + Math.random()*15);
    onBaseChange(hex);
  };

  const onBaseChange = (hex: string) => {
    setBase(hex);
    setSwatches([
      { hex, name:'Primary' },
      ...getHarmonies(hex).map((h, i) => ({ hex:h, name:'Accent '+(i+1) }))
    ]);
  };

  const exportCSS = () => {
    const lines = swatches.map((c, i) => '  --color-' + makeCSSVarName(i) + ': ' + c.hex + ';');
    const css = ':root {\n' + lines.join('\n') + '\n}';
    const blob = new Blob([css], { type:'text/css' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'palette.css'; a.click();
  };

  const savePalette = () => {
    const p: SavedPalette = { id: crypto.randomUUID(), name: palName || 'Palette '+(palettes.length+1), colors: swatches, createdAt: Date.now() };
    saveP([p, ...palettes]); setPalName('');
  };

  const exportSavedPalette = (p: SavedPalette) => {
    const lines = p.colors.map((c, i) => '  --color-' + makeCSSVarName(i) + ': ' + c.hex + ';');
    const css = ':root {\n' + lines.join('\n') + '\n}';
    const fname = p.name.toLowerCase().replace(/\s+/g, '-') + '.css';
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([css], { type:'text/css' })); a.download = fname; a.click();
  };

  const { r, g, b } = hexToRgb(baseColor);
  const { h, s, l } = hexToHsl(baseColor);

  return (
    <div style={{ minHeight:'100vh', background:'#08080a', display:'flex', flexDirection:'column' }}>
      <header style={{ padding:'16px 20px', borderBottom:'1px solid #18100a', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'linear-gradient(135deg,#f97316,#ea580c)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px #f9731630' }}><Palette size={16} color="white"/></div>
          <div>
            <div style={{ fontWeight:'700', fontSize:'16px', color:'white', lineHeight:1 }}>ColorPalette Pro</div>
            <div style={{ fontSize:'11px', color:'#7c2d12', marginTop:'2px' }}>{palettes.length} saved palette{palettes.length!==1?'s':''}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:'4px' }}>
          {(['picker','saved'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding:'6px 12px', borderRadius:'7px', background:tab===t?'#f9731620':'none', border:`1px solid ${tab===t?'#f97316':'transparent'}`, color:tab===t?'#fb923c':'#7c2d12', fontSize:'12px', fontWeight:'500', cursor:'pointer', fontFamily:'Inter', textTransform:'capitalize' }}>{t}</button>
          ))}
        </div>
      </header>

      <div style={{ flex:1, overflow:'auto', padding:'16px 20px' }}>

        {tab === 'picker' && (
          <div style={{ maxWidth:'600px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'14px' }}>
            {/* Picker */}
            <div style={{ background:'#14100a', border:'1px solid #18100a', borderRadius:'14px', padding:'18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'16px' }}>
                <input type="color" value={baseColor} onChange={e => onBaseChange(e.target.value)}
                  style={{ width:'56px', height:'56px', borderRadius:'12px', border:'none', cursor:'pointer', padding:0 }}/>
                <div style={{ flex:1 }}>
                  <input value={baseColor} onChange={e => { if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) onBaseChange(e.target.value); }}
                    style={{ width:'100%', background:'#08080a', border:'1px solid #18100a', borderRadius:'8px', padding:'8px 12px', color:'white', fontSize:'14px', outline:'none', fontFamily:'monospace' }}
                    onFocus={e => e.target.style.borderColor='#f97316'} onBlur={e => e.target.style.borderColor='#18100a'}/>
                  <div style={{ fontSize:'11px', color:'#7c2d12', marginTop:'5px' }}>RGB({r},{g},{b}) · HSL({h}°,{s}%,{l}%)</div>
                </div>
                <div style={{ display:'flex', gap:'6px' }}>
                  <button onClick={regenerate} style={{ padding:'8px', borderRadius:'8px', background:'#f9731620', border:'1px solid #f9731630', cursor:'pointer', color:'#fb923c' }} title="Random"><RefreshCw size={15}/></button>
                  <button onClick={exportCSS} style={{ padding:'8px', borderRadius:'8px', background:'#f9731620', border:'1px solid #f9731630', cursor:'pointer', color:'#fb923c' }} title="Export CSS"><Download size={15}/></button>
                </div>
              </div>

              {/* Swatches */}
              <div style={{ display:'flex', gap:'6px', marginBottom:'14px' }}>
                {swatches.map((c, i) => (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', gap:'4px' }}>
                    <div style={{ aspectRatio:'1', borderRadius:'10px', background:c.hex, cursor:'pointer', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', transition:'transform 0.15s' }}
                      onClick={() => copyText(c.hex, 'sw-'+i)}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform='scale(1.05)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform='scale(1)'}>
                      {copied==='sw-'+i && <Check size={14} color={isLight(c.hex)?'#000':'#fff'}/>}
                    </div>
                    <div style={{ fontSize:'9px', color:'#7c2d12', textAlign:'center', fontFamily:'monospace' }}>{c.hex}</div>
                  </div>
                ))}
              </div>

              {/* Copy formats */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {[
                  { label:'HEX', value: baseColor },
                  { label:'RGB', value: 'rgb('+r+','+g+','+b+')' },
                  { label:'HSL', value: 'hsl('+h+','+s+'%,'+l+'%)' },
                  { label:'CSS', value: '--primary: '+baseColor+';' },
                ].map(({ label, value }) => (
                  <button key={label} onClick={() => copyText(value, 'fmt-'+label)}
                    style={{ display:'flex', alignItems:'center', gap:'5px', padding:'6px 12px', borderRadius:'8px', background:'#08080a', border:`1px solid ${copied==='fmt-'+label?'#f97316':'#18100a'}`, color:copied==='fmt-'+label?'#fb923c':'#7c2d12', fontSize:'12px', cursor:'pointer', fontFamily:'monospace', transition:'all 0.2s' }}>
                    {copied==='fmt-'+label ? <Check size={11}/> : <Copy size={11}/>}{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <div style={{ display:'flex', gap:'8px' }}>
              <input value={palName} onChange={e => setPalName(e.target.value)} placeholder="Palette name (optional)"
                style={{ flex:1, background:'#14100a', border:'1px solid #18100a', borderRadius:'10px', padding:'10px 14px', color:'white', fontSize:'13px', outline:'none', fontFamily:'Inter' }}
                onFocus={e => e.target.style.borderColor='#f97316'} onBlur={e => e.target.style.borderColor='#18100a'}/>
              <button onClick={savePalette} style={{ display:'flex', alignItems:'center', gap:'5px', padding:'10px 16px', borderRadius:'10px', background:'#f97316', border:'none', color:'white', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter', boxShadow:'0 4px 12px #f9731630', whiteSpace:'nowrap' }}>
                <Heart size={13}/> Save
              </button>
            </div>
          </div>
        )}

        {tab === 'saved' && (
          <div style={{ maxWidth:'600px', margin:'0 auto' }}>
            {palettes.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:'52px', marginBottom:'16px' }}>🎨</div>
                <h3 style={{ fontSize:'20px', fontWeight:'700', color:'white', marginBottom:'8px' }}>No saved palettes</h3>
                <p style={{ color:'#7c2d12', fontSize:'14px', lineHeight:'1.6', maxWidth:'240px', margin:'0 auto' }}>Create a palette and save it here for later use.</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {palettes.map(p => (
                  <div key={p.id} style={{ background:'#14100a', border:'1px solid #18100a', borderRadius:'14px', padding:'16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                      <span style={{ color:'white', fontSize:'14px', fontWeight:'500' }}>{p.name}</span>
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button onClick={() => exportSavedPalette(p)} style={{ padding:'5px', borderRadius:'6px', background:'none', border:'none', cursor:'pointer', color:'#7c2d12' }}><Download size={13}/></button>
                        <button onClick={() => saveP(palettes.filter(x => x.id!==p.id))} style={{ padding:'5px', borderRadius:'6px', background:'none', border:'none', cursor:'pointer', color:'#7c2d12' }}><Trash2 size={13}/></button>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'6px' }}>
                      {p.colors.map((c, i) => (
                        <div key={i} style={{ flex:1, height:'40px', borderRadius:'8px', background:c.hex, cursor:'pointer', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', transition:'transform 0.15s' }}
                          onClick={() => copyText(c.hex, 'saved-'+p.id+'-'+i)}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform='scale(1.05)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform='scale(1)'}>
                          {copied==='saved-'+p.id+'-'+i && <Check size={12} color={isLight(c.hex)?'#000':'#fff'}/>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
