const KAABA_COORDS = Object.freeze({ lat: 21.4225, lon: 39.8262 });
const DEFAULT_LOCATION = Object.freeze({ lat: 21.3891, lon: 39.8579, label: 'مكة المكرمة' });
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
const locationInfoEl = document.getElementById('locationInfo');
const needle = document.getElementById('needle');
let qibla = null;
let orientationAttached = false;
let currentNeedle = 0;

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
  if(!navigator.geolocation){
    statusEl.textContent='❌ المتصفح لا يدعم GPS. تم استخدام مكة المكرمة.';
    applyLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, `${DEFAULT_LOCATION.label} (افتراضي)`);
    return;
  }
  statusEl.textContent='جاري تحديد الموقع...';
  navigator.geolocation.getCurrentPosition(pos=>{
    applyLocation(pos.coords.latitude, pos.coords.longitude, 'الموقع الحالي');
  }, _=>{
    statusEl.textContent='تعذّر تحديد الموقع. تم استخدام مكة المكرمة.';
    applyLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, `${DEFAULT_LOCATION.label} (افتراضي)`);
  }, {enableHighAccuracy:true, timeout:10000});
}

function norm(deg){ let d=(deg%360+360)%360; if(d>180)d-=360; return d; }

function applyLocation(lat, lon, label){
  qibla = computeQibla(lat, lon);
  updateKaabaMarker();
  updateLocationText(label || 'الموقع', lat, lon);
  statusEl.textContent='حرّك الهاتف حتى يثبت السهم على القبلة.';
  attachOrientationListener();
}

function updateLocationText(label, lat, lon){
  if(!locationInfoEl) return;
  locationInfoEl.textContent = `${label}: ${lat.toFixed(4)}°N، ${lon.toFixed(4)}°E`;
}

function updateKaabaMarker(){
  if(!kaabaMarker || qibla==null) return;
  kaabaMarker.style.transform =
    `translate(-50%, -50%) rotate(${qibla}deg) translateY(-${MARKER_DISTANCE}px) rotate(${-qibla}deg)`;
  kaabaMarker.style.opacity = '1';
}

function attachOrientationListener(){
  if(orientationAttached) return;
  window.addEventListener('deviceorientation', onOrient, true);
  orientationAttached = true;
}

function onOrient(e){
  if(qibla==null) return;
  let heading = (typeof e.webkitCompassHeading==='number') ? e.webkitCompassHeading : (360 - (e.alpha||0));
  if(isNaN(heading)) { statusEl.textContent='⚠️ فعّل مستشعر الحركة.'; return; }

  const target = qibla - heading;
  const delta  = norm(target - currentNeedle);
  currentNeedle = currentNeedle + delta * 0.22;

  if(needle){
    needle.style.transform = `translateX(-50%) rotate(${currentNeedle}deg)`;
  }

  const error = Math.abs(norm(target));
  const ok = error <= 6;
  if(ok){
    statusEl.textContent = 'اتجاه القبلة صحيح ✅';
    statusEl.classList.add('success');
    if(navigator.vibrate) navigator.vibrate([0,40,40,40]);
  }else{
    statusEl.classList.remove('success');
    statusEl.textContent = 'اضغط ابدأ ثم حرّك الهاتف حتى يثبت السهم على القبلة.';
  }
}
