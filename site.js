document.documentElement.classList.add('js')
const pages=[
{id:'home',href:'index.html',label:'Home'},
{id:'about',href:'about.html',label:'About'},
{id:'works',href:'visual-works.html',label:'Works'},
{id:'practice',href:'practice.html',label:'Practice'},
{id:'contact',href:'contact.html',label:'Contact'}
]
const currentPage=document.body.dataset.page
const profile=siteconfig.profile
const contact=siteconfig.contact
const contributionText='Contributor to '+profile.visits+' visits'
const mottoText=profile.tagline.replace(/\.$/,'')
function PadTwo(number){return String(number).padStart(2,'0')}
function Highlight(sentence){return sentence.replace(profile.handle,'<b>'+profile.handle+'</b>').replace('UI/UX Design','<b>UI/UX Design</b>').replace('Programming','<b>Programming</b>')}
function SplitChars(text){return text.split('').map(function(letter,index){return '<span class="ch"><span style="--i:'+index+'">'+letter+'</span></span>'}).join('')}
const navLinks=pages.map(function(page){return '<a class="mag'+(page.id===currentPage?' on" aria-current="page':'')+'" href="'+page.href+'"><span class="rl"><i>'+page.label+'</i><i aria-hidden="true">'+page.label+'</i></span></a>'}).join('')
document.body.insertAdjacentHTML('afterbegin','<div class="curtain"><span class="curtainname">'+profile.handle+'</span><span class="curtaincount">000</span><span class="curtainbar"></span></div><div class="progress"></div><div class="ring"><span></span></div><video class="peek" muted loop playsinline preload="none"></video><header class="top"><a class="mark" href="index.html"><img src="Logo.png" alt=""><b>'+profile.handle+'</b></a><nav class="nav">'+navLinks+'</nav></header>')
document.querySelector('main').insertAdjacentHTML('afterend','<footer class="foot"><div class="footbig" data-text="'+profile.handle+'">'+profile.handle+'</div><div class="footrow"><span>'+profile.handle+' (c) 2026</span><a class="mag" id="toTop" href="#top">Back to top</a><span>'+contributionText+'</span></div></footer>')
const bigName=document.getElementById('bigName')
if(bigName){
bigName.innerHTML=SplitChars(profile.handle)
bigName.setAttribute('aria-label',profile.handle)
document.getElementById('heroRole').textContent=profile.role
document.getElementById('heroStatus').innerHTML='<i class="live"></i>'+profile.status
document.getElementById('heroSub').textContent=profile.tagline
document.getElementById('heroIntro').textContent=profile.intro
document.getElementById('stats').innerHTML=
'<div class="stat reveal"><small>Contributor to</small><b data-count="'+profile.visits+'">'+profile.visits+'</b><small>Visits</small></div>'+
'<div class="stat reveal"><small>Experience</small><b data-count="'+profile.years+'">'+profile.years+'</b><small>Years</small></div>'+
'<div class="stat reveal"><small>Age</small><b data-count="'+profile.age+'">'+profile.age+'</b><small>Years old</small></div>'
function FitName(){
bigName.style.fontSize='100px'
const fitSize=100*(bigName.parentElement.clientWidth/bigName.offsetWidth)
bigName.style.fontSize=Math.min(fitSize,560)+'px'
}
FitName()
window.addEventListener('resize',FitName)
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(FitName)
const ribbonItems=siteconfig.ribbon.map(function(entry){return '<div class="ritem"><img src="'+entry.icon+'" alt=""><div><b>'+entry.title+'</b><small>'+entry.line+'</small></div></div><i class="rdot"></i>'}).join('')
const ribbonWords=siteconfig.ribbon.map(function(entry){return '<span class="rword">'+entry.title+'</span>'}).join('')
document.getElementById('ribbonA').innerHTML=ribbonItems+ribbonItems+ribbonItems+ribbonItems
document.getElementById('ribbonB').innerHTML=ribbonWords+ribbonWords+ribbonWords+ribbonWords
document.getElementById('mottoText').innerHTML=mottoText.split(' ').map(function(word){return '<span class="mw">'+word+'</span>'}).join(' ')
document.getElementById('idxList').innerHTML=siteconfig.videos.map(function(video,index){return '<a class="idx reveal" href="visual-works.html#'+video.group.toLowerCase()+'" data-cursor="View" data-video="'+video.file+'"><span class="idxnum">'+PadTwo(index+1)+'</span><span class="idxname">'+video.name+'</span><span class="idxtag">'+(video.tag||'')+'</span><span class="idxgo">View</span></a>'}).join('')
document.getElementById('homeLead').innerHTML=Highlight(profile.lead)
const badgeLoop=(mottoText.toUpperCase()+' &bull; ').repeat(2)
document.getElementById('badge').innerHTML='<svg viewBox="0 0 200 200" aria-hidden="true"><defs><path id="badgePath" d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0"/></defs><text><textPath href="#badgePath" textLength="510" lengthAdjust="spacing">'+badgeLoop+'</textPath></text></svg><img src="Logo.png" alt="">'
}
const aboutLead=document.getElementById('aboutLead')
if(aboutLead){
aboutLead.innerHTML=Highlight(profile.lead)
document.getElementById('aboutIntro').textContent=profile.intro
}
const reels=document.getElementById('reels')
if(reels){
siteconfig.groups.forEach(function(group,groupIndex){
const groupVideos=siteconfig.videos.filter(function(video){return video.group===group.id})
const block=document.createElement('div')
block.className='workgroup'
block.id=group.id.toLowerCase()
block.innerHTML='<div class="grouphead reveal"><span class="groupnum">'+PadTwo(groupIndex+1)+'</span><h2 class="grouptitle">'+group.id+'</h2><span class="groupcount">'+PadTwo(groupVideos.length)+' '+(groupVideos.length===1?'Work':'Works')+'</span></div><p class="groupintro reveal">'+group.intro+'</p><div class="work"></div>'
const list=block.querySelector('.work')
groupVideos.forEach(function(video,index){
const reel=document.createElement('article')
reel.className='piece reveal'
reel.innerHTML='<div class="piecehead"><h3 class="piecename"><span class="piecenum">'+PadTwo(index+1)+'</span>'+video.name+'</h3><span class="piecemeta">'+(video.tag||'')+'<span class="piecetime"></span></span></div><div class="piecemedia"><video class="piecevideo" src="'+video.file+(video.poster?'" poster="'+video.poster:'#t=0.1')+'" controls preload="metadata" playsinline></video></div>'+(video.description?'<p class="piecedesc">'+video.description+'</p>':'')
const player=reel.querySelector('video')
const timeLabel=reel.querySelector('.piecetime')
player.addEventListener('loadedmetadata',function(){
const totalSeconds=Math.round(player.duration)
timeLabel.textContent=' / '+Math.floor(totalSeconds/60)+':'+String(totalSeconds%60).padStart(2,'0')
})
list.appendChild(reel)
})
reels.appendChild(block)
})
document.addEventListener('play',function(event){
document.querySelectorAll('video.piecevideo').forEach(function(other){if(other!==event.target)other.pause()})
},true)
}
const panels=document.getElementById('panels')
if(panels)panels.innerHTML=siteconfig.skills.map(function(skill,index){return '<div class="skill spot tilt reveal"><div class="skillhead"><span class="skillnum">'+PadTwo(index+1)+'</span><img src="'+skill.icon+'" alt=""></div><h3 class="skilltitle">'+skill.title+'</h3><p class="skilldesc">'+skill.description+'</p></div>'}).join('')
const contactList=document.getElementById('clinks')
if(contactList){
const contactRows=[]
if(contact.discord)contactRows.push({href:'https://discord.com/users/'+contact.discord,icon:'Icons/discord.png',name:'Discord',sub:contact.discordhandle||contact.discord,external:true})
if(contact.roblox)contactRows.push({href:contact.roblox,icon:'Icons/roblox.png',name:'Roblox',sub:'Profile',external:true})
if(contact.email)contactRows.push({href:'mailto:'+contact.email,icon:'Icons/contact-mail.png',name:'Email',sub:contact.email,external:false})
if(contact.github)contactRows.push({href:'https://github.com/'+contact.github,icon:'Icons/code.png',name:'GitHub',sub:contact.github,external:true})
contactList.innerHTML=contactRows.map(function(row){return '<a class="clink spot reveal" data-cursor="Open" href="'+row.href+'"'+(row.external?' target="_blank" rel="noopener"':'')+'><img src="'+row.icon+'" alt=""><span class="clinkname"><b>'+row.name+'</b><small>'+row.sub+'</small></span><span class="clinkgo">Open</span></a>'}).join('')
}
