// bar fill on load
window.addEventListener('load',()=>{
  setTimeout(()=>{document.getElementById('bar').style.width='94%'},400);
});
// duplicate ticker for seamless loop
const t=document.getElementById('ticker');
t.innerHTML+=t.innerHTML;
// reveal on scroll
const io=new IntersectionObserver((es)=>{
  es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
// FAQ accordion (single-open within a group)
document.querySelectorAll('.faq-q').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const item=btn.closest('.faq-item');
    const open=item.classList.contains('open');
    const group=item.closest('.faq');
    if(group){group.querySelectorAll('.faq-item.open').forEach(i=>{if(i!==item)i.classList.remove('open')})}
    item.classList.toggle('open',!open);
  });
});
