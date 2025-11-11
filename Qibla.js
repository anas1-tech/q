const KAABA_COORDS = Object.freeze({ lat: 21.4225, lon: 39.8262 });
const MARKER_DISTANCE = 120; // pixels from center to place the Kaaba emoji

// حساب اتجاه القبلة من إحداثيات المستخدم
function computeQibla(lat, lon){
  const KaabaLat = KAABA_COORDS.lat * Math.PI/180;
  const KaabaLon = KAABA_COORDS.lon * Math.PI/180;
  const φ = lat * Math.PI/180, λ = lon * Math.PI/180;
  const y = Math.sin(KaabaLon - λ) * Math.cos(KaabaLat);
  const x = Math.cos(φ)*Math.sin(KaabaLat) - Math.sin(φ)*Math.cos(KaabaLat)*Math.cos(KaabaLon - λ);
  return (Math.atan2(y, x) * 180/Math.PI + 360) % 360; // 0..360 من الشمال
}

const statusEl = document.getElementById('status');
const kaabaMarker = document.getElementById('kaabaMarker');
let qibla = null;

// بدء التشغيل بزر واحد
document.getElementById('startBtn').addEventListener('click', startAll);

async function startAll(){
  statusEl.textContent = 'جاري طلب الأذونات...';

  // iOS: إذن مستشعر الاتجاه
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function'){
    try{
      const res = await DeviceOrientationEvent.requestPermission();
      if(res !== 'granted'){ statusEl.textContent = '❌ لم يتم منح إذن البوصلة.'; return; }
    }catch(e){ statusEl.textContent = '❌ تعذّر إذن البوصلة.'; return; }
  }

  // GPS
  if(!navigator.geolocation){ statusEl.textContent='❌ المتصفح لا يدعم GPS.'; return; }
  statusEl.textContent='جاري تحديد الموقع...';
  navigator.geolocation.getCurrentPosition(pos=>{
    qibla = computeQibla(pos.coords.latitude, pos.coords.longitude);
    statusEl.textContent='حرّك الهاتف حتى تستقر أيقونة الكعبة على اتجاه القبلة.';
    window.addEventListener('deviceorientation', onOrient, true);
  }, _=>{
    statusEl.textContent='❌ فشل تحديد الموقع. فعّل GPS ومنح الإذن.';
  }, {enableHighAccuracy:true, timeout:10000});
}

// تنعيم الزاوية
let current = 0;
function norm(deg){ let d=(deg%360+360)%360; if(d>180)d-=360; return d; }
function lerp(a,b,t){ return a+(b-a)*t; }

function onOrient(e){
  if(qibla==null) return;
  let heading = (typeof e.webkitCompassHeading==='number') ? e.webkitCompassHeading : (360 - (e.alpha||0));
  if(isNaN(heading)) { statusEl.textContent='⚠️ فعّل مستشعر الحركة.'; return; }

  // الهدف: فرق القبلة عن اتجاه الجهاز
  let target = qibla - heading;            // درجة
  let delta  = norm(target - current);
  current    = lerp(current, current + delta, 0.22);

  if(kaabaMarker){
    const angle = current;
    kaabaMarker.style.transform =
      `translate(-50%, -50%) rotate(${angle}deg) translateY(-${MARKER_DISTANCE}px) rotate(${-angle}deg)`;
  }

  const ok = Math.abs(norm(target)) <= 6;
  if(ok){
    statusEl.textContent = 'اتجاه القبلة صحيح ✅';
    statusEl.classList.add('success');
    if(navigator.vibrate) navigator.vibrate([0,40,40,40]);
  }else{
    statusEl.classList.remove('success');
    statusEl.textContent = 'اضغط ابدأ ثم حرّك الهاتف حتى تستقر أيقونة الكعبة على اتجاه القبلة.';
  }
}
