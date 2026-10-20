const reduceMotion=matchMedia('(prefers-reduced-motion:reduce)').matches
const finePointer=matchMedia('(hover:hover) and (pointer:fine)').matches
const curtain=document.querySelector('.curtain')
const curtainCount=curtain.querySelector('.curtaincount')
const curtainEase='cubic-bezier(.76,0,.24,1)'
const progressBar=document.querySelector('.progress')
const ring=document.querySelector('.ring')
const peek=document.querySelector('.peek')
const hero=document.getElementById('hero')
const heroWrap=document.getElementById('heroWrap')
const ribbonA=document.getElementById('ribbonA')
const ribbonB=document.getElementById('ribbonB')
const ringLabel=ring.querySelector('span')
const curtainBar=curtain.querySelector('.curtainbar')
const badge=document.getElementById('badge')
const badgeRing=badge&&badge.querySelector('svg')
const mottoWords=Array.from(document.querySelectorAll('.mw'))
const mottoBlock=document.querySelector('.motto')
const footBig=document.querySelector('.footbig')
const pointer={x:innerWidth/2,y:innerHeight/2}
const ringPos={x:pointer.x,y:pointer.y}
const peekPos={x:pointer.x,y:pointer.y,scale:.85,scaleGoal:.85}
const glowPos={x:innerWidth*.62,y:innerHeight*.32}
let targetScroll=scrollY
let currentScroll=scrollY
let smoothing=false
let lastScroll=scrollY
let ribbonOffsetA=0
let ribbonOffsetB=0
let sequenceA=0
let sequenceB=0
function Lerp(from,to,amount){return from+(to-from)*amount}
function StartPage(){document.body.classList.add('ready')}
function OpenCurtain(delay){
return curtain.animate([{transform:'translateY(0)'},{transform:'translateY(-100%)'}],{duration:reduceMotion?1:900,delay:delay,easing:curtainEase,fill:'forwards'})
}
function HasSeenLoader(){
try{
const seen=sessionStorage.getItem('loaded')==='1'
sessionStorage.setItem('loaded','1')
return seen
}catch(error){
console.warn('[PORTFOLIO] storage blocked, loader will replay')
return false
}
}
function RunLoader(){
if(HasSeenLoader()||reduceMotion){
curtainCount.textContent=''
OpenCurtain(0)
setTimeout(StartPage,reduceMotion?0:350)
return
}
const startTime=performance.now()
function Step(now){
const progress=Math.min((now-startTime)/1300,1)
curtainCount.textContent=String(Math.round(progress*100)).padStart(3,'0')
curtainBar.style.transform='scaleX('+progress+')'
if(progress<1){requestAnimationFrame(Step);return}
OpenCurtain(150)
setTimeout(StartPage,500)
}
requestAnimationFrame(Step)
}
RunLoader()
window.addEventListener('pageshow',function(event){
if(!event.persisted)return
curtain.getAnimations().forEach(function(animation){animation.cancel()})
curtain.style.transform='translateY(-100%)'
StartPage()
})
document.addEventListener('click',function(event){
const link=event.target.closest('a[href]')
if(!link||event.metaKey||event.ctrlKey||event.shiftKey||link.target==='_blank'||link.origin!==location.origin||link.getAttribute('href').startsWith('#')||link.pathname===location.pathname)return
event.preventDefault()
curtainCount.textContent=''
const cover=curtain.animate([{transform:'translateY(100%)'},{transform:'translateY(0)'}],{duration:reduceMotion?1:650,easing:curtainEase,fill:'forwards'})
cover.finished.then(function(){location.href=link.href})
})
document.getElementById('toTop').addEventListener('click',function(event){
event.preventDefault()
if(finePointer&&!reduceMotion){targetScroll=0;smoothing=true;return}
scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'})
})
if(finePointer&&!reduceMotion){
addEventListener('wheel',function(event){
if(event.ctrlKey)return
event.preventDefault()
const step=event.deltaMode===1?event.deltaY*33:event.deltaY
const maxScroll=document.documentElement.scrollHeight-innerHeight
targetScroll=Math.max(0,Math.min(targetScroll+step,maxScroll))
smoothing=true
},{passive:false})
addEventListener('scroll',function(){
if(smoothing)return
targetScroll=scrollY
currentScroll=scrollY
})
}
addEventListener('pointermove',function(event){
pointer.x=event.clientX
pointer.y=event.clientY
ring.classList.add('on')
const labelled=event.target.closest('[data-cursor]')
ringLabel.textContent=labelled?labelled.dataset.cursor:''
ring.classList.toggle('label',Boolean(labelled))
ring.classList.toggle('big',!labelled&&Boolean(event.target.closest('a,button,.mag')))
ring.classList.toggle('hide',Boolean(event.target.closest('video')))
})
document.addEventListener('pointerleave',function(){ring.classList.remove('on')})
document.querySelectorAll('.mag').forEach(function(element){
element.addEventListener('pointermove',function(event){
const box=element.getBoundingClientRect()
element.style.transform='translate('+(event.clientX-box.left-box.width/2)*.28+'px,'+(event.clientY-box.top-box.height/2)*.4+'px)'
})
element.addEventListener('pointerleave',function(){element.style.transform=''})
})
document.querySelectorAll('.spot').forEach(function(element){
element.addEventListener('pointermove',function(event){
const box=element.getBoundingClientRect()
element.style.setProperty('--mx',event.clientX-box.left+'px')
element.style.setProperty('--my',event.clientY-box.top+'px')
})
})
document.querySelectorAll('.split').forEach(function(heading){
heading.innerHTML=heading.textContent.trim().split(' ').map(function(word,index){return '<span class="w"><span style="--i:'+index+'">'+word+'</span></span>'}).join(' ')
})
document.querySelectorAll('.reveal').forEach(function(element){
const siblings=Array.from(element.parentElement.children).filter(function(child){return child.classList.contains('reveal')})
element.style.setProperty('--d',Math.min(siblings.indexOf(element),6)*90+'ms')
})
function CountUp(label){
const parts=label.dataset.count.match(/^([\d.]+)(.*)$/)
if(!parts||reduceMotion)return
const goal=parseFloat(parts[1])
const decimals=(parts[1].split('.')[1]||'').length
const startTime=performance.now()
function Step(now){
const progress=Math.min((now-startTime)/1600,1)
label.textContent=(goal*(1-Math.pow(1-progress,4))).toFixed(decimals)+parts[2]
if(progress<1)requestAnimationFrame(Step)
}
requestAnimationFrame(Step)
}
const revealWatcher=new IntersectionObserver(function(entries){
entries.forEach(function(entry){
if(!entry.isIntersecting)return
entry.target.classList.add('in')
revealWatcher.unobserve(entry.target)
entry.target.querySelectorAll('[data-count]').forEach(CountUp)
})
},{threshold:.12})
document.querySelectorAll('.reveal,.split').forEach(function(element){revealWatcher.observe(element)})
if(finePointer)document.querySelectorAll('.idx').forEach(function(row){
row.addEventListener('pointerenter',function(){
peek.src=row.dataset.video
peek.play()
peek.classList.add('on')
peekPos.scaleGoal=1
})
row.addEventListener('pointerleave',function(){
peek.classList.remove('on')
peek.pause()
peekPos.scaleGoal=.85
})
})
function MeasureRibbons(){
if(ribbonA)sequenceA=ribbonA.scrollWidth/4
if(ribbonB){sequenceB=ribbonB.scrollWidth/4;if(!ribbonOffsetB)ribbonOffsetB=-sequenceB}
}
MeasureRibbons()
addEventListener('resize',MeasureRibbons)
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(MeasureRibbons)
document.querySelectorAll('.tilt').forEach(function(card){
card.addEventListener('pointermove',function(event){
const box=card.getBoundingClientRect()
const offsetX=(event.clientX-box.left)/box.width-.5
const offsetY=(event.clientY-box.top)/box.height-.5
card.style.transform='perspective(900px) rotateX('+-offsetY*7+'deg) rotateY('+offsetX*9+'deg) translateZ(0)'
})
card.addEventListener('pointerleave',function(){card.style.transform=''})
})
if(footBig)footBig.addEventListener('pointermove',function(event){
const box=footBig.getBoundingClientRect()
footBig.style.setProperty('--mx',event.clientX-box.left+'px')
footBig.style.setProperty('--my',event.clientY-box.top+'px')
})
function Clamp(number,low,high){return Math.max(low,Math.min(high,number))}
function Tick(){
if(smoothing){
currentScroll=Lerp(currentScroll,targetScroll,.085)
if(Math.abs(targetScroll-currentScroll)<.4){currentScroll=targetScroll;smoothing=false}
scrollTo(0,currentScroll)
}
const velocity=scrollY-lastScroll
lastScroll=scrollY
progressBar.style.transform='scaleX('+scrollY/Math.max(document.documentElement.scrollHeight-innerHeight,1)+')'
if(finePointer){
ringPos.x=Lerp(ringPos.x,pointer.x,.18)
ringPos.y=Lerp(ringPos.y,pointer.y,.18)
ring.style.transform='translate3d('+ringPos.x+'px,'+ringPos.y+'px,0)'
peekPos.x=Lerp(peekPos.x,pointer.x+36,.14)
peekPos.y=Lerp(peekPos.y,pointer.y-90,.14)
peekPos.scale=Lerp(peekPos.scale,peekPos.scaleGoal,.12)
peek.style.transform='translate3d('+peekPos.x+'px,'+peekPos.y+'px,0) scale('+peekPos.scale+')'
}
if(!reduceMotion){
if(ribbonA&&sequenceA){
ribbonOffsetA-=.7+Math.min(Math.abs(velocity),60)*.35
if(ribbonOffsetA<=-sequenceA)ribbonOffsetA+=sequenceA
ribbonA.style.transform='translate3d('+ribbonOffsetA+'px,0,0)'
}
if(ribbonB&&sequenceB){
ribbonOffsetB+=.9+Math.min(Math.abs(velocity),60)*.4
if(ribbonOffsetB>=0)ribbonOffsetB-=sequenceB
ribbonB.style.transform='translate3d('+ribbonOffsetB+'px,0,0)'
}
if(badgeRing)badgeRing.style.transform='rotate('+scrollY*.12+'deg)'
}
if(mottoBlock&&mottoWords.length){
const mottoBox=mottoBlock.getBoundingClientRect()
const mottoProgress=Clamp((innerHeight*.85-mottoBox.top)/(innerHeight*.6),0,1)*mottoWords.length
mottoWords.forEach(function(word,index){word.style.opacity=.16+Clamp(mottoProgress-index,0,1)*.84})
}
if(hero&&scrollY<innerHeight*1.2){
const box=hero.getBoundingClientRect()
glowPos.x=Lerp(glowPos.x,pointer.x-box.left,.06)
glowPos.y=Lerp(glowPos.y,pointer.y-box.top,.06)
hero.style.setProperty('--gx',glowPos.x+'px')
hero.style.setProperty('--gy',glowPos.y+'px')
if(!reduceMotion){
const shift=Math.min(scrollY,innerHeight)
heroWrap.style.transform='translate3d(0,'+shift*.2+'px,0)'
heroWrap.style.opacity=1-shift/(innerHeight*.9)
}
}
requestAnimationFrame(Tick)
}
requestAnimationFrame(Tick)
