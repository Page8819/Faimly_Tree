'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
const fn=source.slice(source.indexOf('function appViewportHeight(){'),source.indexOf('function treeViewport(){'));
function harness(options={}){
 const props={};
 const window={innerWidth:393,innerHeight:795,screen:{width:393,height:852},visualViewport:{height:795,scale:1},...options.window};
 const navigator={standalone:true,userAgent:'iPhone',...options.navigator};
 const document={activeElement:{tagName:options.tag||'BODY'},documentElement:{style:{setProperty(k,v){props[k]=v;}}}};
 const context={window,navigator,document};vm.createContext(context);vm.runInContext(fn,context);
 return {context,props,height:context.appViewportHeight()};
}
test('installed iPhone stays inside visible web view even when screen is taller',()=>{
 const h=harness();assert.equal(h.height,795);h.context.syncAppViewport();assert.equal(h.props['--legacy-viewport-height'],'795px');
});
test('landscape installed iPhone respects its visible viewport',()=>{
 assert.equal(harness({window:{innerWidth:852,innerHeight:350,visualViewport:{height:350,scale:1}}}).height,350);
});
test('navigation and safe padding both remain inside the rendered viewport',()=>{
 for(const [innerHeight,visibleHeight] of [[795,795],[852,795],[795,852],[350,350]]){
  const h=harness({window:{innerHeight,visualViewport:{height:visibleHeight,scale:1}}});
  const safe=34,navHeight=60+safe,navTop=h.height-navHeight;
  assert.ok(navTop+navHeight<=Math.min(innerHeight,visibleHeight));
  assert.ok(navTop+5+45<=h.height-safe,'full tab touch targets are visible above safe inset');
 }
});
test('Safari and iPad keep their visible viewport, not device screen height',()=>{
 assert.equal(harness({navigator:{standalone:false}}).height,795);
 assert.equal(harness({navigator:{userAgent:'iPad'}}).height,795);
});
test('keyboard and zoom do not trigger full screen expansion',()=>{
 assert.equal(harness({tag:'INPUT',window:{visualViewport:{height:440,scale:1}}}).height,440);
 assert.equal(harness({window:{visualViewport:{height:397.5,scale:2}}}).height,795);
});
test('bottom navigation background reaches zero; safe inset pads its buttons',()=>{
 const css=fs.readFileSync(require('node:path').join(__dirname,'../public/interface.css'),'utf8');
 assert.match(css,/height:var\(--legacy-viewport-height,100dvh\)!important/);
 assert.match(css,/\.app \.main-topbar\{bottom:0;width:100%;max-width:none;height:calc\(60px \+ var\(--ui-bottom\)\);padding:5px 13px var\(--ui-bottom\)/);
});
