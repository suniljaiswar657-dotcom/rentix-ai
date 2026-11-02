import { authClient, apiRequest } from "./auth-client.js";

let data = { properties: [], tenants: [], payments: [], maintenance: [] };
let authMode = "signin";
let authUser = null;
let storageKey = "rentix-ai-local-preview";
const save = () => localStorage.setItem(storageKey, JSON.stringify({ payments: data.payments, maintenance: data.maintenance }));
const $ = (selector) => document.querySelector(selector);
const money = (value) => "₹" + Number(value || 0).toLocaleString("en-IN");
const initials = (name) => name.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase();
const save = () => localStorage.setItem("rentix-demo-data", JSON.stringify(data));
const toast = (message) => { const el=$("#toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2600); };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function totals(){const expected=data.payments.reduce((sum,p)=>sum+p.amount,0);const collected=data.payments.filter(p=>p.status==="Paid").reduce((sum,p)=>sum+p.amount,0);return{expected,collected,pending:expected-collected,rate:expected?Math.round(collected/expected*100):0};}
function renderOverview(){
 const t=totals();
 $("#totalProperties").textContent=String(data.properties.length).padStart(2,"0");
 $("#monthlyRent").textContent=money(t.expected);$("#collectedRent").textContent=money(t.collected);$("#pendingRent").textContent=money(t.pending);
 $("#collectionRate").textContent=t.rate+"%";$("#collectedSummary").textContent=money(t.collected);$("#ringPercent").textContent=t.rate+"%";
 $("#progressBar").style.width=t.rate+"%";$("#progressRing").style.background="conic-gradient(var(--green) 0 "+t.rate+"%,#edf1f3 "+t.rate+"% 100%)";
 $("#legendCollected").textContent=money(t.collected);$("#legendPending").textContent=money(t.pending);
 const pending=data.payments.filter(p=>p.status==="Pending");
 const tasks=[...pending.map(p=>({icon:"₹",title:"Rent pending",detail:p.tenant+" · "+money(p.amount)})),...data.maintenance.filter(m=>m.status!=="Resolved").map(m=>({icon:"⌁",title:"Maintenance request",detail:m.title+" · "+m.property}))];
 $("#attentionCount").textContent=String(tasks.length).padStart(2,"0");
 $("#reminderList").innerHTML=tasks.length?tasks.slice(0,4).map(item=>'<div class="reminder-item"><span class="reminder-symbol">'+item.icon+'</span><span class="reminder-copy"><strong>'+escapeHtml(item.title)+'</strong><small>'+escapeHtml(item.detail)+'</small></span><span class="reminder-action">Review →</span></div>').join(""):'<div class="empty-state">You’re all caught up.</div>';
 $("#recentRentRows").innerHTML=paymentRows(data.payments.slice(0,5),false);
}
function paymentRows(rows,actions){return rows.map(p=>'<tr><td><div class="person-cell"><span class="mini-avatar">'+initials(p.tenant)+'</span><span><strong>'+escapeHtml(p.tenant)+'</strong><small>Tenant</small></span></div></td><td>'+escapeHtml(p.property)+'</td><td>'+escapeHtml(p.due)+'</td><td><strong>'+money(p.amount)+'</strong></td><td><span class="status '+(p.status==="Paid"?"paid":"pending")+'">'+p.status+'</span></td><td>'+(actions&&p.status!=="Paid"?'<button class="row-action" data-paid="'+p.id+'">Mark paid</button>':"")+'</td></tr>').join("")||'<tr><td colspan="6" class="empty-state">No payment records yet.</td></tr>';}
function renderProperties(){$("#propertyNavCount").textContent=data.properties.length;$("#propertyGrid").innerHTML=data.properties.map(p=>'<article class="property-card"><div class="property-visual"><span>PROPERTY · '+String(p.id).padStart(2,"0")+'</span></div><div class="property-body"><h3>'+escapeHtml(p.name)+'</h3><p>⌖ '+escapeHtml(p.address)+'</p><div class="property-meta"><span>Units<br><strong>'+p.units+'</strong></span><span>Monthly rent<br><strong>'+money(p.rent)+'</strong></span><span>Occupancy<br><strong>'+escapeHtml(p.occupancy)+'</strong></span></div></div></article>').join("")||'<div class="panel empty-state">No properties added yet. Add your first property.</div>';}
function renderTenants(){$("#tenantRows").innerHTML=data.tenants.map(t=>'<tr><td><div class="person-cell"><span class="mini-avatar">'+initials(t.name)+'</span><span><strong>'+escapeHtml(t.name)+'</strong><small>Tenant ID #'+t.id+'</small></span></div></td><td>'+escapeHtml(t.property)+'</td><td><strong>'+money(t.rent)+'</strong></td><td><span class="status paid">'+escapeHtml(t.lease)+'</span></td><td>'+escapeHtml(t.phone)+'</td></tr>').join("")||'<tr><td colspan="5" class="empty-state">No tenants added yet.</td></tr>';}
function renderRent(){$("#rentRows").innerHTML=paymentRows(data.payments,true);}
function renderMaintenance(){$("#maintenanceList").innerHTML=data.maintenance.map(m=>'<article class="maintenance-card"><span class="maintenance-icon">⌁</span><div class="maintenance-copy"><strong>'+escapeHtml(m.title)+'</strong><small>'+escapeHtml(m.property)+' · Reported '+escapeHtml(m.reported)+'</small></div><span class="status '+(m.status==="Open"?"pending":m.status==="Resolved"?"paid":"open")+'">'+escapeHtml(m.status)+'</span></article>').join("")||'<div class="panel empty-state">No maintenance requests. Nice work!</div>';}
function renderAll(){renderOverview();renderProperties();renderTenants();renderRent();renderMaintenance();}
function navigate(view){document.querySelectorAll(".view-panel").forEach(panel=>panel.classList.toggle("active",panel.id==="view-"+view));document.querySelectorAll(".nav-link").forEach(link=>link.classList.toggle("active",link.dataset.view===view));const labels={overview:"Overview",properties:"Properties",tenants:"Tenants",rent:"Rent & payments",maintenance:"Maintenance"};$("#crumbTitle").textContent=labels[view];$("#pageTitle").innerHTML=labels[view]==="Overview"?'Good evening, Owner <span>✦</span>':labels[view];$("#pageSubtitle").textContent=({overview:"Here’s what’s happening across your rental portfolio.",properties:"Keep your rental units organised.",tenants:"People currently connected to your properties.",rent:"Track expected rent and payment status.",maintenance:"Track repairs and property service tasks."})[view];$("#sidebar").classList.remove("open");}
document.querySelectorAll(".nav-link").forEach(link=>link.addEventListener("click",()=>navigate(link.dataset.view)));
document.querySelectorAll("[data-go]").forEach(button=>button.addEventListener("click",()=>navigate(button.dataset.go)));
$("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#dismissNotice").addEventListener("click",()=>$(".demo-notice").remove());
$("#helpButton").addEventListener("click",()=>toast("This is a demo workspace. Data stays in this browser."));
$("#year").textContent=new Date().getFullYear();
$("#dateLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase();
const modal=$("#modalBackdrop");
function openModal(type){const configs={
 property:{title:"Add property",fields:[["name","Property name","text","e.g. Lakeview Residency"],["address","Address / location","text","City, area"],["units","Number of units","number","1"],["rent","Monthly rent (₹)","number","15000"]]},
 tenant:{title:"Add tenant",fields:[["name","Tenant full name","text","Full name"],["property","Property name","select",data.properties.map(p=>p.name)],["rent","Monthly rent (₹)","number","15000"],["phone","Phone number","tel","+91"]]},
 payment:{title:"Record payment",fields:[["tenant","Tenant name","select",data.tenants.map(t=>t.name)],["property","Property name","select",data.properties.map(p=>p.name)],["due","Due date","text","e.g. 05 Dec 2026"],["amount","Amount received / due (₹)","number","15000"],["status","Payment status","select",["Paid","Pending"]]]},
 maintenance:{title:"New maintenance request",fields:[["title","Issue title","text","Describe the issue"],["property","Property name","select",data.properties.map(p=>p.name)],["reported","Reported date","text","Today"],["status","Status","select",["Open","In progress","Resolved"]]]}
};const config=configs[type];if(!config)return;$("#modalTitle").textContent=config.title;$("#recordForm").dataset.type=type;$("#formFields").innerHTML=config.fields.map(([name,label,kind,placeholder])=>'<div class="form-field"><label for="field-'+name+'">'+label+'</label>'+(kind==="select"?'<select id="field-'+name+'" name="'+name+'" required>'+(placeholder.length?placeholder.map(v=>'<option value="'+escapeHtml(v)+'">'+escapeHtml(v)+'</option>').join(""):'<option value="">Add a property first</option>')+'</select>':'<input id="field-'+name+'" name="'+name+'" type="'+kind+'" placeholder="'+escapeHtml(placeholder)+'" '+(kind==="number"?'min="0" step="1"':'')+' required>')+'</div>').join("");modal.classList.add("open");modal.setAttribute("aria-hidden","false");}
function closeModal(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true");}
$("#quickAdd").addEventListener("click",()=>openModal("property"));
document.querySelectorAll("[data-add]").forEach(button=>button.addEventListener("click",()=>openModal(button.dataset.add)));
$("#closeModal").addEventListener("click",closeModal);$("#cancelModal").addEventListener("click",closeModal);modal.addEventListener("click",event=>{if(event.target===modal)closeModal();});
$("#recordForm").addEventListener("submit",async event=>{event.preventDefault();const type=event.currentTarget.dataset.type;const values=Object.fromEntries(new FormData(event.currentTarget));const id=Date.now();const submit=event.currentTarget.querySelector('[type="submit"]');submit.disabled=true;try{
if(type==="property"){await apiRequest("/api/properties",{method:"POST",body:JSON.stringify({name:values.name,address:values.address,unit_count:Number(values.units),monthly_rent:Number(values.rent),occupancy_status:"available"})});await loadAccount();}
if(type==="tenant"){const property=data.properties.find(p=>p.name===values.property);await apiRequest("/api/tenants",{method:"POST",body:JSON.stringify({full_name:values.name,property_id:property?.id||null,monthly_rent:Number(values.rent),phone:values.phone})});await loadAccount();}
if(type==="payment"){data.payments.push({id,tenant:values.tenant,property:values.property,due:values.due,amount:Number(values.amount),status:values.status});}
if(type==="maintenance"){data.maintenance.push({id,title:values.title,property:values.property,reported:values.reported,status:values.status});}
save();renderAll();closeModal();toast(type==="property"||type==="tenant"?"Saved securely to your RENTIX account.":"Saved in this browser preview.");event.currentTarget.reset();
}catch(error){toast(error.message||"Unable to save record.");}finally{submit.disabled=false;}});
document.addEventListener("click",event=>{const button=event.target.closest("[data-paid]");if(!button)return;const payment=data.payments.find(item=>item.id===Number(button.dataset.paid));if(payment){payment.status="Paid";save();renderAll();toast("Payment marked as paid.");}});
renderAll();

function mapProperty(row){return {id:row.id,name:row.name,address:row.address,units:Number(row.unit_count),rent:Number(row.monthly_rent),occupancy:String(row.occupancy_status||"available").replace(/^./,c=>c.toUpperCase())};}
function mapTenant(row){return {id:row.id,name:row.full_name,property:row.property_name||"Unassigned",rent:Number(row.monthly_rent),phone:row.phone||"—",lease:String(row.lease_status||"active").replace(/^./,c=>c.toUpperCase())};}
async function loadAccount(){
 const [properties,tenants]=await Promise.all([apiRequest("/api/properties"),apiRequest("/api/tenants")]);
 data.properties=(properties.properties||[]).map(mapProperty);
 data.tenants=(tenants.tenants||[]).map(mapTenant);
 renderAll();
}
function showAuthError(message){$("#authError").textContent=message||"";}
function setAuthMode(mode){
 authMode=mode;const signup=mode==="signup";
 $("#authTitle").textContent=signup?"Create your account":"Welcome back";
 $("#authSubtitle").textContent=signup?"Set up your private rental workspace.":"Sign in to manage your rental portfolio.";
 $("#authNameField").hidden=!signup;
 $("#authName").required=signup;
 $("#authPassword").autocomplete=signup?"new-password":"current-password";
 $("#authSubmit").textContent=signup?"Create account":"Sign in";
 $("#authSwitch").textContent=signup?"Already have an account? Sign in":"New to RENTIX AI? Create account";
 showAuthError("");
}
async function bootstrap(){
 $("#authGate").hidden=false;
 try{
  const result=await authClient.getSession();
  const session=result?.data?.session;
  authUser=result?.data?.user||session?.user||null;
  if(!session){$("#authGate").hidden=false;return;}
  const email=authUser?.email||"account";
  storageKey="rentix-ai-local-preview:"+email.toLowerCase();
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||"{}");data.payments=saved.payments||[];data.maintenance=saved.maintenance||[];}catch{data.payments=[];data.maintenance=[];}
  await loadAccount();
  $("#authGate").hidden=true;
  const actions=$(".top-actions");
  actions.innerHTML='<span class="account-email">'+escapeHtml(email)+'</span><button class="signout-button" id="signOutButton" type="button">Sign out</button>';
  $("#signOutButton").addEventListener("click",async()=>{await authClient.signOut();location.reload();});
  $("#pageTitle").innerHTML="Welcome, "+escapeHtml(authUser?.name||email.split("@")[0])+' <span>✦</span>';
 }catch(error){
  console.error(error);
  showAuthError("Could not load your account. Please sign in again.");
  $("#authGate").hidden=false;
 }
}
$("#authSwitch").addEventListener("click",()=>setAuthMode(authMode==="signin"?"signup":"signin"));
$("#authForm").addEventListener("submit",async event=>{
 event.preventDefault();showAuthError("");
 const values=Object.fromEntries(new FormData(event.currentTarget));
 const button=$("#authSubmit");button.disabled=true;button.textContent="Please wait…";
 try{
  const result=authMode==="signup"
   ? await authClient.signUp.email({name:values.name,email:values.email,password:values.password})
   : await authClient.signIn.email({email:values.email,password:values.password});
  if(result?.error)throw new Error(result.error.message||"Authentication failed");
  await bootstrap();
  if(!$("#authGate").hidden)throw new Error("Sign-in succeeded but session could not be loaded. Please try again.");
 }catch(error){showAuthError(error.message||"Unable to authenticate. Please check your details.");}
 finally{button.disabled=false;button.textContent=authMode==="signup"?"Create account":"Sign in";}
});
setAuthMode("signin");
bootstrap();
