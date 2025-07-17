const authSection    = document.getElementById('authSection')
const calendarEl     = document.getElementById('calendar')
const monthYearEl    = document.getElementById('monthYear')
const prevBtn        = document.getElementById('prevMonth')
const nextBtn        = document.getElementById('nextMonth')
const selectionPanel = document.getElementById('selectionPanel')
const weightCtx      = document.getElementById('weightChart').getContext('2d')
const cardioCtx      = document.getElementById('cardioChart').getContext('2d')
const macroSideCtx   = document.getElementById('macroSidebarChart').getContext('2d')

let now = new Date(),
    selectedMonth    = now.getMonth(),
    selectedYear     = now.getFullYear(),
    selectedDateKey  = null

const MACROS_PER_GRAM = {
  'Tavuk Göğsü':   { Protein:0.235, Karbonhidrat:0,     Yağ:0.007  },
  'Pirinç Pilavı': { Protein:0.0661, Karbonhidrat:0.7934, Yağ:0.0058 },
  'Yumurta':       { Protein:0.1256, Karbonhidrat:0.0072, Yağ:0.09513},
  'Zeytinyağı':    { Protein:0,      Karbonhidrat:0,     Yağ:0.884  }
}

function signupHandler() {
  const email = document.getElementById('email').value.trim()
  const pass  = document.getElementById('password').value
  auth.createUserWithEmailAndPassword(email, pass)
    .then(cred => console.log('Kayıt başarılı, UID =', cred.user.uid))
    .catch(err => console.error('Kayıt hatası:', err.message))
}

function loginHandler() {
  const email = document.getElementById('email').value.trim()
  const pass  = document.getElementById('password').value
  auth.signInWithEmailAndPassword(email, pass)
    .then(cred => console.log('Giriş başarılı, UID =', cred.user.uid))
    .catch(err => console.error('Giriş hatası:', err.message))
}

auth.onAuthStateChanged(user => {
  if (user) {
    authSection.innerHTML = `
      <span>Hoşgeldin ${user.email.split('@')[0]}</span>
      <button id="btnLogout">Çıkış Yap</button>
    `
    document.getElementById('btnLogout').onclick = () => auth.signOut()
    loadCalendar(user.uid)
    loadFoods(user.uid)
  } else {
    authSection.innerHTML = `
      <input id="email" type="email" placeholder="E‑posta">
      <input id="password" type="password" placeholder="Şifre">
      <button id="btnSignup">Kayıt Ol</button>
      <button id="btnLogin">Giriş Yap</button>
    `
    document.getElementById('btnSignup').onclick = signupHandler
    document.getElementById('btnLogin').onclick  = loginHandler
  }
})

function loadCalendar(uid) {
  db.collection('users').doc(uid).collection('calendar').get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const { status, workout, cardio } = doc.data()
        const key = doc.id
        localStorage.setItem(key, status)
        localStorage.setItem(key + '-workout', workout)
        localStorage.setItem(key + '-cardio', cardio)
      })
      renderCalendar()
      updateCharts()
    })
}

function loadFoods(uid) {
  db.collection('users').doc(uid).collection('foods').get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const items = doc.data().foodItems
        localStorage.setItem(doc.id + '-foodItems', JSON.stringify(items))
      })
      if (selectedDateKey) {
        updateSelectionPanel()
        updateSidebarMacro()
      }
    })
}

Chart.register(ChartDataLabels)

let weightChart = new Chart(weightCtx, {
  type: 'pie',
  data: { labels: ['Yaptı', 'Yapmadı'], datasets: [{ data: [0, 0] }] },
  options: { plugins: { datalabels: { formatter: (v, ctx) => { const d = ctx.dataset.data, s = d.reduce((a, b) => a + b, 0); return s ? (v * 100 / s).toFixed(1) + '%' : '' } } } }
})

let cardioChart = new Chart(cardioCtx, {
  type: 'pie',
  data: { labels: ['Yaptı', 'Yapmadı'], datasets: [{ data: [0, 0] }] },
  options: { plugins: { datalabels: { formatter: (v, ctx) => { const d = ctx.dataset.data, s = d.reduce((a, b) => a + b, 0); return s ? (v * 100 / s).toFixed(1) + '%' : '' } } } }
})

let macroSidebarChart = new Chart(macroSideCtx, {
  type: 'pie',
  data: { labels: ['Protein', 'Karbonhidrat', 'Yağ'], datasets: [{ data: [0, 0, 0] }] },
  options: { plugins: { datalabels: { formatter: (v, ctx) => { const d = ctx.dataset.data, s = d.reduce((a, b) => a + b, 0); return s ? (v * 100 / s).toFixed(1) + '%' : '' } } } }
})

const weekdays  = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi']
const monthNames= ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım']

function renderCalendar() {
  calendarEl.innerHTML = ''
  selectionPanel.innerHTML = ''
  let firstDay = new Date(selectedYear, selectedMonth, 1).getDay()
  let daysCount = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  monthYearEl.textContent = monthNames[selectedMonth] + ' ' + selectedYear
  for (let i = 0; i < firstDay; i++) calendarEl.appendChild(document.createElement('div'))
  for (let d = 1; d <= daysCount; d++) {
    let cell = document.createElement('div')
    cell.classList.add('day-cell')
    let key = `${selectedYear}-${selectedMonth+1}-${d}`
    let status = localStorage.getItem(key)
    if (status === 'yapti')    cell.classList.add('mark-yapti')
    if (status === 'yapmadi')  cell.classList.add('mark-yapmadi')
    if (status === 'offday')   cell.classList.add('mark-offday')
    let dt = new Date(selectedYear, selectedMonth, d)
    cell.innerHTML = `<div>${d}</div><div style="font-size:0.6em;">${weekdays[dt.getDay()]}</div>`
    cell.onclick = () => { selectedDateKey = key; renderCalendar(); updateSelectionPanel(); updateCharts(); updateSidebarMacro() }
    if (selectedDateKey === key) cell.classList.add('selected')
    calendarEl.appendChild(cell)
  }
}

function updateSelectionPanel() {
  selectionPanel.innerHTML = ''
  if (!selectedDateKey) return
  ;['Yaptı','Yapmadı','Off day'].forEach(label => {
    let val = label === 'Yaptı' ? 'yapti' : label === 'Yapmadı' ? 'yapmadi' : 'offday'
    let btn = document.createElement('button')
    btn.textContent = label
    btn.onclick = () => {
      let cur = localStorage.getItem(selectedDateKey)
      if (cur === val) localStorage.removeItem(selectedDateKey)
      else localStorage.setItem(selectedDateKey, val)
      renderCalendar(); updateSelectionPanel(); updateCharts(); updateSidebarMacro()
    }
    selectionPanel.append(btn)
  })
  let cSel = document.createElement('select')
  ;['Evet','Hayır'].forEach(o => cSel.add(new Option(o, o)))
  cSel.value = localStorage.getItem(selectedDateKey + '-cardio') || 'Hayır'
  cSel.onchange = () => { localStorage.setItem(selectedDateKey + '-cardio', cSel.value); updateCharts() }
  selectionPanel.append(document.createTextNode('Kardiyo? '), cSel)
  if (localStorage.getItem(selectedDateKey) === 'yapti') {
    let wSel = document.createElement('select')
    ;['itiş','çekiş','bacak'].forEach(o => wSel.add(new Option(o, o)))
    wSel.value = localStorage.getItem(selectedDateKey + '-workout') || 'itiş'
    wSel.onchange = () => { localStorage.setItem(selectedDateKey + '-workout', wSel.value); updateCharts() }
    selectionPanel.append(document.createTextNode('Hangi Antrenman? '), wSel)
  }
  let fk = selectedDateKey + '-foodItems'
  let fsel = document.createElement('select')
  ;['Tavuk Göğsü','Pirinç Pilavı','Yumurta','Zeytinyağı','Diğer'].forEach(o => fsel.add(new Option(o, o)))
  let custom = document.createElement('input'); custom.placeholder = 'Yemek adı'; custom.style.display = 'none'
  fsel.onchange = () => { custom.style.display = fsel.value === 'Diğer' ? 'inline-block' : 'none' }
  let grams = document.createElement('input'); grams.type = 'number'; grams.placeholder = 'Gram'
  let addb  = document.createElement('button'); addb.textContent = 'Ekle'
  let list  = document.createElement('ul')
  addb.onclick = () => {
    let food = fsel.value === 'Diğer' ? custom.value.trim() : fsel.value
    let g = parseFloat(grams.value); if (!food || isNaN(g)) return
    let m = MACROS_PER_GRAM[food] || {Protein:0, Karbonhidrat:0, Yağ:0}
    let P = +(m.Protein * g).toFixed(2)
    let C = +(m.Karbonhidrat * g).toFixed(2)
    let Y = +(m.Yağ * g).toFixed(2)
    let items = JSON.parse(localStorage.getItem(fk) || '[]')
    items.push({ food, grams:g, Protein:P, Karbonhidrat:C, Yağ:Y })
    localStorage.setItem(fk, JSON.stringify(items))
    renderFood(); updateSidebarMacro()
  }
  let totals = document.createElement('div')
  function renderFood() {
    list.innerHTML = ''
    let items = JSON.parse(localStorage.getItem(fk) || '[]')
    let tCal=0, tP=0, tC=0, tY=0
    items.forEach(it => {
      let cal = it.Protein*4 + it.Karbonhidrat*4 + it.Yağ*9
      tCal += cal; tP += it.Protein; tC += it.Karbonhidrat; tY += it.Yağ
      let li = document.createElement('li')
      li.textContent = `${it.grams}g ${it.food}: ${Math.round(cal)} kcal`
      list.append(li)
    })
    totals.textContent = `Toplam: ${Math.round(tCal)} kcal, P:${tP.toFixed(2)}g C:${tC.toFixed(2)}g Y:${tY.toFixed(2)}g`
  }
  selectionPanel.append(fsel, custom, grams, addb, list, totals)
  renderFood(); updateSidebarMacro()
}

function updateSidebarMacro() {
  if (!selectedDateKey) return
  let fk = selectedDateKey + '-foodItems'
  let items = JSON.parse(localStorage.getItem(fk) || '[]')
  let p=0,c=0,y=0
  items.forEach(it => { p+=it.Protein; c+=it.Karbonhidrat; y+=it.Yağ })
  let calP = p*4, calC = c*4, calY = y*9, sum = calP+calC+calY
  macroSideCtx.canvas.parentNode.style.display = sum>0 ? 'block' : 'none'
  macroSidebarChart.data.datasets[0].data = [calP, calC, calY]
  macroSidebarChart.update()
}

function updateCharts() {
  let wDone=0,wNot=0,cDone=0,cNot=0
  let daysCount = new Date(selectedYear, selectedMonth+1, 0).getDate()
  for (let d=1; d<=daysCount; d++) {
    let key = `${selectedYear}-${selectedMonth+1}-${d}`
    let st  = localStorage.getItem(key)
    let cd  = localStorage.getItem(key+'-cardio')
    if (st==='yapti') wDone++ else if (st==='yapmadi') wNot++
    if (cd==='Evet') cDone++ else if (cd==='Hayır') cNot++
  }
  weightChart.data.datasets[0].data = [wDone, wNot]; weightChart.update()
  cardioChart.data.datasets[0].data = [cDone, cNot]; cardioChart.update()
}

prevBtn.onclick = () => {
  selectedMonth--; if (selectedMonth<0) { selectedMonth=11; selectedYear-- }
  selectedDateKey = null; renderCalendar(); updateCharts(); updateSidebarMacro()
}

nextBtn.onclick = () => {
  selectedMonth++; if (selectedMonth>11) { selectedMonth=0; selectedYear++ }
  selectedDateKey = null; renderCalendar(); updateCharts(); updateSidebarMacro()
}

renderCalendar(); updateCharts(); updateSidebarMacro()
