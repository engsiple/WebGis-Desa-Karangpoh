// --- 1. INISIALISASI PETA ---
const map = L.map("map", {
  center: [-7.6517, 109.6397], // Koordinat Desa Karangpoh, Kebumen
  zoom: 16,
  zoomControl: false,
  minZoom: 5,
  maxZoom: 19,
});

// Marker Utama Lokasi Karangpoh
L.marker([-7.6517, 109.6397])
  .addTo(map)
  .bindPopup("<b>Karangpoh, Pejagoan</b><br>Kabupaten Kebumen.")
  .openPopup();

// --- 2. DEFINISI BASEMAP ---
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
});

const googleStreets = L.tileLayer('https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
  maxZoom: 20,
  attribution: 'Map data &copy; Google'
});

const googleSat = L.tileLayer('https://mt0.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
  maxZoom: 20,
  attribution: 'Map data &copy; Google'
});

const terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: 'Map data: &copy; OSM | Style: &copy; OpenTopoMap'
});

osm.addTo(map);

map.on("click", function (e) {
  const lat = e.latlng.lat.toFixed(5);
  const lng = e.latlng.lng.toFixed(5);
  alert("Koordinat: " + lat + ", " + lng);
});

// --- 3. SKEMA WARNA & STYLE SPASIAL ---
const warnaKemiringan = {
  "Datar": "#22c55e",        
  "Landai": "#84cc16",       
  "Agak Curam": "#eab308",   
  "Curam": "#f97316",        
  "Sangat Curam": "#ef4444"  
};

const warnaTutupanLahan = {
  "Air": "#4a90e2",
  "Vegetasi": "#3b823e",
  "Vegetasi terendam air": "#8b7bc6",
  "Tanaman": "#e68a2e",
  "Area Terbangun": "#d3312c",
  "Lahan Kosong": "#ab9e98",
  "Awan": "#646464",
  "Padang Rumput": "#e8e5c4",
  "Lainnya": "#000000" 
};

function styleKemiringanLereng(feature) {
  const p = feature.properties || {};
  
  let rawClass = (p.classify || p.klasifikasi || p.KL_KLAS || p.REMARK || "").toString().trim();
  let klasifikasi = "";

  if (/datar/i.test(rawClass)) klasifikasi = "Datar";
  else if (/landai/i.test(rawClass)) klasifikasi = "Landai";
  else if (/agak (curam|kecam)/i.test(rawClass)) klasifikasi = "Agak Curam";
  else if (/sangat (curam|kecam)/i.test(rawClass)) klasifikasi = "Sangat Curam";
  else if (/(curam|kecam)/i.test(rawClass)) klasifikasi = "Curam";

  if (!klasifikasi && (p.kemiringan_persen !== undefined || p.kemiringan !== undefined || p.KL !== undefined)) {
    const nilai = parseFloat(p.kemiringan_persen || p.kemiringan || p.KL);
    if (nilai <= 8) klasifikasi = "Datar";
    else if (nilai <= 15) klasifikasi = "Landai";
    else if (nilai <= 25) klasifikasi = "Agak Curam";
    else if (nilai <= 45) klasifikasi = "Curam";
    else klasifikasi = "Sangat Curam";
  }

  return {
    fillColor: warnaKemiringan[klasifikasi] || "#22c55e",
    fillOpacity: 0.4, 
    color: "#333333",
    weight: 0.3,
    bubblingMouseEvents: false,
  };
}

function styleTutupanLahan(feature) {
  const p = feature.properties || {};
  let rawKategori = "";
  
  // 1. Coba cari di kolom yang umum digunakan QGIS/GIS
  const kemungkinanKolom = ["Name", "NAME", "tutupan", "TUTUPAN", "guna_lahan", "Guna_Lahan", "kategori", "Kategori", "jenis", "Jenis", "REMARK", "KETERANGAN", "LANDUSE", "NAMOBJ", "kelas", "Layer"];
  
  for (let kolom of kemungkinanKolom) {
    if (p[kolom]) {
      rawKategori = p[kolom].toString().trim().toLowerCase();
      break;
    }
  }

  // 2. Jika masih kosong, cari otomatis properti tipe string pertama di file
  if (!rawKategori) {
    for (let key in p) {
      if (typeof p[key] === 'string' && isNaN(p[key])) {
        rawKategori = p[key].toString().trim().toLowerCase();
        break;
      }
    }
  }

  // 3. Pencocokan String untuk 8 kategori landcover
  let kategori = "Lainnya";
  if (rawKategori.includes("terendam") || rawKategori === "vegetasi terendam air") {
    kategori = "Vegetasi terendam air";
  } else if (rawKategori === "vegetasi" || rawKategori.includes("vegetasi")) {
    kategori = "Vegetasi";
  } else if (rawKategori.includes("terbangun")) {
    kategori = "Area Terbangun";
  } else if (rawKategori.includes("kosong")) {
    kategori = "Lahan Kosong";
  } else if (rawKategori.includes("rumput")) {
    kategori = "Padang Rumput";
  } else if (rawKategori.includes("tanaman")) {
    kategori = "Tanaman";
  } else if (rawKategori.includes("awan")) {
    kategori = "Awan";
  } else if (rawKategori === "air" || rawKategori.includes("air")) {
    kategori = "Air";
  }

  return {
    fillColor: warnaTutupanLahan[kategori] || "#06b6d4", 
    fillOpacity: 0.65,
    color: "#1e293b",
    weight: 0.8,
  };
}

function styleAliranSungai(feature) {
  return {
    color: "#0284c7",
    weight: feature.properties && feature.properties.NAMOBJ ? 3 : 1.5,
    opacity: 0.85,
  };
}

function styleJalan(feature) {
  const jenisJalan = feature.properties ? feature.properties.REMARK : "";
  let weight = 2;
  let color = "#dc2626";
  let dashArray = null;

  if (jenisJalan === "Jalan Setapak") {
    weight = 1.5;
    color = "#7f1d1d";
    dashArray = "4, 4";
  } else if (jenisJalan === "Jalan Lain") {
    weight = 3;
    color = "#e11d48";
  }

  return {
    color: color,
    weight: weight,
    opacity: 0.9,
    dashArray: dashArray,
  };
}

function getCustomIcon(keterangan) {
  let iconClass = 'fa-map-marker-alt';
  let color = '#333';
  let namaLower = keterangan ? keterangan.toLowerCase() : '';

  if (namaLower.includes('masjid') || namaLower.includes('musholla')) {
    iconClass = 'fa-mosque'; color = '#28a745';
  } else if (namaLower.includes('sdn') || namaLower.includes('sd alam')) {
    iconClass = 'fa-school'; color = '#fd7e14';
  } else if (namaLower.includes('polindes')) {
    iconClass = 'fa-clinic-medical'; color = '#dc3545';
  } else if (namaLower.includes('lapangan')) {
    iconClass = 'fa-futbol'; color = '#6f42c1';
  } else if (namaLower.includes('kantor kepala desa')) {
    iconClass = 'fa-landmark'; color = '#007bff';
  }

  return L.divIcon({
    html: `<div style="color: ${color}; font-size: 26px; text-shadow: 1px 1px 2px #fff;"><i class="fas ${iconClass}"></i></div>`,
    className: 'custom-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
}

// --- 4. LOAD DATA GEOJSON ---
const layerKemiringan = L.layerGroup();
const layerTutupanLahan = L.layerGroup();
const layerAliranSungai = L.layerGroup();
const layerJalan = L.layerGroup();
const layerBatasAdmin = L.layerGroup();
const layerFasilitas = L.layerGroup();

// 4.1 Kemiringan Lereng
fetch("data/kemiringan_lereng.geojson")
  .then((res) => res.json())
  .then((data) => {
    L.geoJSON(data, {
      style: styleKemiringanLereng,
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        const kelas = p.classify || p.klasifikasi || p.REMARK || "-";
        const persen = p.kemiringan_persen || p.kemiringan || p.KL || "-";
        layer.bindPopup(
          `<b>Kemiringan Lereng</b><br>` +
            `Klasifikasi: ${kelas}<br>` +
            `Kemiringan: ${persen}%`
        );
        if (kelas !== "-") layer.bindTooltip(`Lereng: ${kelas}`);
      },
    }).addTo(layerKemiringan);
  })
  .catch((err) => console.error("Gagal load kemiringan_lereng.geojson:", err));

// 4.2 Tutupan Lahan (Otomatis deteksi kolom string GeoJSON)
fetch("data/tutupanlahan_202607.geojson")
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP status ${res.status} File tidak ditemukan / Gagal dimuat`);
    return res.json();
  })
  .then((data) => {
    console.log("Data Tutupan Lahan berhasil dimuat:", data);

    const geoJsonLayer = L.geoJSON(data, {
      style: styleTutupanLahan,
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        let jenis = "";
        
        const kemungkinanKolom = ["Name", "NAME", "tutupan", "TUTUPAN", "guna_lahan", "Guna_Lahan", "kategori", "Kategori", "jenis", "Jenis", "REMARK", "KETERANGAN", "LANDUSE", "NAMOBJ", "kelas", "Layer"];
        for (let kolom of kemungkinanKolom) {
          if (p[kolom]) {
            jenis = p[kolom].toString().trim();
            break;
          }
        }

        if (!jenis) {
          for (let key in p) {
            if (typeof p[key] === 'string' && isNaN(p[key])) {
              jenis = p[key].toString().trim();
              break;
            }
          }
        }
        
        if (!jenis) jenis = "Tidak Diketahui"; 

        layer.bindPopup(`<b>Tutupan Lahan</b><br>Kategori: ${jenis}`);
        layer.bindTooltip(`Tutupan: ${jenis}`);
      },
    }).addTo(layerTutupanLahan);

    if (data.features && data.features.length > 0) {
      map.fitBounds(geoJsonLayer.getBounds());
    }
  })
  .catch((err) => console.error("Gagal load tutupanlahan_202607.geojson:", err));

// 4.3 Aliran Sungai
fetch("data/aliran_sungai.geojson")
  .then((res) => res.json())
  .then((data) => {
    L.geoJSON(data, {
      style: styleAliranSungai,
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        const namaSungai = p.NAMOBJ || "Anak Sungai / Saluran";
        layer.bindPopup(
          `<b>${namaSungai}</b><br>` +
            `Panjang: ${p.SHAPE_Leng ? p.SHAPE_Leng.toFixed(5) : "-"}`
        );
        if (p.NAMOBJ) layer.bindTooltip(p.NAMOBJ);
      },
    }).addTo(layerAliranSungai);
  })
  .catch((err) => console.error("Gagal load aliran_sungai.geojson:", err));

// 4.4 Jalan
fetch("data/jalan.geojson")
  .then((res) => res.json())
  .then((data) => {
    L.geoJSON(data, {
      style: styleJalan,
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        layer.bindPopup(
          `<b>Jalan</b><br>` +
            `Jenis: ${p.REMARK || "Jalan Utama"}`
        );
        if (p.REMARK) layer.bindTooltip(p.REMARK);
      },
    }).addTo(layerJalan);
  })
  .catch((err) => console.error("Gagal load jalan.geojson:", err));

// 4.5 Batas Administrasi
const batasAdministrasiData = {
  "type": "FeatureCollection",
  "name": "batas_administrasi",
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  "features": [
      { "type": "Feature", "properties": { "LEFT_FID": -1, "RIGHT_FID": 0 }, "geometry": { "type": "MultiLineString", "coordinates": [ [ [ 109.647034084000026, -7.644287982, 0.0 ], [ 109.647028480000102, -7.644511206999907, 0.0 ], [ 109.647052275000121, -7.644808639999915, 0.0 ], [ 109.6470273340001, -7.645323873999913, 0.0 ], [ 109.647026174000089, -7.645533845999966, 0.0 ], [ 109.646908793000051, -7.64635293599997, 0.0 ], [ 109.64687310100004, -7.646644420999929, 0.0 ], [ 109.646843357000066, -7.646816930999903, 0.0 ], [ 109.646801717000073, -7.646918057999922, 0.0 ], [ 109.64666080700006, -7.647175036999957, 0.0 ], [ 109.646364293000033, -7.647560908999909, 0.0 ], [ 109.646173935, -7.647727471999924, 0.0 ], [ 109.645822965, -7.648013005999924, 0.0 ], [ 109.64547794300006, -7.648256901999942, 0.0 ], [ 109.645192408000057, -7.648477001999946, 0.0 ], [ 109.64504400100013, -7.648707000999969, 0.0 ], [ 109.644823592000094, -7.648994533999956, 0.0 ], [ 109.644740310000046, -7.649137301999956, 0.0 ], [ 109.64459159400009, -7.649393093999982, 0.0 ], [ 109.644502364000076, -7.649601296999978, 0.0 ], [ 109.644454775000042, -7.649839242999948, 0.0 ], [ 109.644460724000098, -7.650047445999944, 0.0 ], [ 109.64448626800008, -7.650307064999931, 0.0 ], [ 109.644465338000117, -7.650540048999935, 0.0 ], [ 109.644419083000031, -7.650719643999962, 0.0 ], [ 109.644294161000076, -7.651040871999984, 0.0 ], [ 109.64408595900008, -7.651373995000013, 0.0 ], [ 109.643738999000064, -7.651790998999966, 0.0 ], [ 109.643483637000074, -7.652143633000011, 0.0 ], [ 109.643321834000105, -7.652457721999975, 0.0 ], [ 109.643169549000021, -7.652857471999922, 0.0 ], [ 109.643121959000084, -7.653190596999951, 0.0 ], [ 109.643131477000068, -7.653504685, 0.0 ], [ 109.643083888000035, -7.654018647999986, 0.0 ], [ 109.643036299000102, -7.654513575999903, 0.0 ], [ 109.643026780000113, -7.654932361, 0.0 ], [ 109.643007745000048, -7.655332110999949, 0.0 ], [ 109.642998227000064, -7.655903180999949, 0.0 ], [ 109.642979192000084, -7.656274376999931, 0.0 ], [ 109.642931602000047, -7.656778822999924, 0.0 ], [ 109.642884013000113, -7.657064357999924, 0.0 ], [ 109.642737466000071, -7.657693042999894, 0.0 ], [ 109.642617514000094, -7.658139874999917, 0.0 ], [ 109.642484264000075, -7.658482516999935, 0.0 ], [ 109.642274871000069, -7.658863230999905, 0.0 ], [ 109.641732354000041, -7.659681765999951, 0.0 ], [ 109.641123212000082, -7.660576444, 0.0 ], [ 109.64066200000012, -7.661272999999894, 0.0 ], [ 109.640406, -7.661804, 0.0 ], [ 109.640227, -7.662259000999941, 0.0 ], [ 109.64007624900006, -7.66295590399996, 0.0 ], [ 109.640019142000128, -7.663488903, 0.0 ], [ 109.640009624000044, -7.66405045599993, 0.0 ], [ 109.640019142000128, -7.664364544999983, 0.0 ], [ 109.64005721400008, -7.664583455999977, 0.0 ], [ 109.640133356000078, -7.664792847999894, 0.0 ], [ 109.640323712000011, -7.665097418999959, 0.0 ], [ 109.640523588000036, -7.665344881999917, 0.0 ], [ 109.641199354000079, -7.666077756999893, 0.0 ], [ 109.641662901000061, -7.666532740999968, 0.0 ], [ 109.64089955200005, -7.667153242999972, 0.0 ], [ 109.640649709000073, -7.667123499999909, 0.0 ], [ 109.640453403, -7.666820118999943, 0.0 ], [ 109.640144073000073, -7.666983707999978, 0.0 ], [ 109.640072689000121, -7.667025346999959, 0.0 ], [ 109.639968588000031, -7.667007500999904, 0.0 ], [ 109.639918024000025, -7.666965860999922, 0.0 ], [ 109.63984366600009, -7.6669034, 0.0 ], [ 109.639810949000037, -7.666873656999932, 0.0 ], [ 109.639751462000092, -7.666864733999904, 0.0 ], [ 109.639602746000051, -7.666855810999965, 0.0 ], [ 109.639489721000103, -7.666826066999902, 0.0 ], [ 109.639370748000033, -7.666778478999961, 0.0 ], [ 109.639314236000061, -7.666710068999985, 0.0 ], [ 109.63928449300009, -7.666647607999969, 0.0 ], [ 109.639239878000041, -7.666576225000013, 0.0 ], [ 109.639207160000083, -7.666528634999984, 0.0 ], [ 109.639147674000057, -7.666495916999941, 0.0 ], [ 109.638979891000119, -7.66647909299997, 0.0 ], [ 109.638586377000067, -7.666539878999937, 0.0 ], [ 109.638222320000054, -7.666593415999926, 0.0 ], [ 109.637911800000026, -7.666611261999981, 0.0 ], [ 109.63762747100013, -7.666600212999955, 0.0 ], [ 109.637330418000062, -7.666550878999959, 0.0 ], [ 109.637254316000067, -7.666521888999958, 0.0 ], [ 109.637098783000084, -7.666455636999983, 0.0 ], [ 109.636902311000071, -7.666382210999948, 0.0 ], [ 109.636916588000105, -7.666201371999906, 0.0 ], [ 109.636916588000105, -7.666110952999886, 0.0 ], [ 109.63691182900007, -7.666034809999892, 0.0 ], [ 109.63691182900007, -7.665920595999945, 0.0 ], [ 109.63691182900007, -7.665906318999919, 0.0 ], [ 109.636921347000055, -7.665811140999948, 0.0 ], [ 109.636916588000105, -7.665677890999937, 0.0 ], [ 109.636926106, -7.665482774999957, 0.0 ], [ 109.636949901000023, -7.665311453999904, 0.0 ], [ 109.636964177000038, -7.665121096999964, 0.0 ], [ 109.637011767000075, -7.664921221999946, 0.0 ], [ 109.637045079000075, -7.664678517999937, 0.0 ], [ 109.637066276000056, -7.664544020999911, 0.0 ], [ 109.637167001000037, -7.664334, 0.0 ], [ 109.637387, -7.663834, 0.0 ], [ 109.637531, -7.663289, 0.0 ], [ 109.637653001000018, -7.662701, 0.0 ], [ 109.637742000000102, -7.662255, 0.0 ], [ 109.637775, -7.661928, 0.0 ], [ 109.637787, -7.661667, 0.0 ], [ 109.637755000000112, -7.661427, 0.0 ], [ 109.637712001000097, -7.661198, 0.0 ], [ 109.637621000000124, -7.660867, 0.0 ], [ 109.637663000000131, -7.66066, 0.0 ], [ 109.637709000000115, -7.660262, 0.0 ], [ 109.637809999000041, -7.65989, 0.0 ], [ 109.637901, -7.659547, 0.0 ], [ 109.637924, -7.659031, 0.0 ], [ 109.637813999000102, -7.658622, 0.0 ], [ 109.637729, -7.658391, 0.0 ], [ 109.637712000000107, -7.658267, 0.0 ], [ 109.637625, -7.657821, 0.0 ], [ 109.637581999000091, -7.657569, 0.0 ], [ 109.637471, -7.657375, 0.0 ], [ 109.637156000000104, -7.657048, 0.0 ], [ 109.637001, -7.656874000999983, 0.0 ], [ 109.636897, -7.6562, 0.0 ], [ 109.636758999000037, -7.655094, 0.0 ], [ 109.63672, -7.654691, 0.0 ], [ 109.636787000000126, -7.654331, 0.0 ], [ 109.636877027000111, -7.65391945899995, 0.0 ], [ 109.636905756, -7.653496526999951, 0.0 ], [ 109.636923427000042, -7.653430479, 0.0 ], [ 109.63697696500013, -7.653323402999926, 0.0 ], [ 109.636994811000093, -7.653280572999935, 0.0 ], [ 109.637001949000066, -7.653202049999922, 0.0 ], [ 109.636991242000065, -7.653127096999937, 0.0 ], [ 109.636930268000086, -7.653034297999986, 0.0 ], [ 109.636835088000026, -7.652921273999961, 0.0 ], [ 109.636793449000038, -7.652730916999931, 0.0 ], [ 109.636787500000082, -7.652379946999935, 0.0 ], [ 109.636817243000053, -7.652106308999943, 0.0 ], [ 109.63688961600009, -7.651900694999894, 0.0 ], [ 109.63710277900006, -7.651630415999914, 0.0 ], [ 109.637221752000045, -7.651529288999895, 0.0 ], [ 109.637310982000045, -7.651362726999969, 0.0 ], [ 109.637346674000071, -7.651184267999947, 0.0 ], [ 109.63733477600006, -7.650964167999944, 0.0 ], [ 109.637281238000071, -7.650809501999936, 0.0 ], [ 109.637174163000097, -7.650654838000018, 0.0 ], [ 109.637043292000016, -7.650488274999915, 0.0 ], [ 109.636983806000075, -7.650381198999937, 0.0 ], [ 109.636918371000078, -7.650113511, 0.0 ], [ 109.636852935000078, -7.649691156999952, 0.0 ], [ 109.636817243000053, -7.64941751799996, 0.0 ], [ 109.636804, -7.649152, 0.0 ], [ 109.636888627000104, -7.648888087999942, 0.0 ], [ 109.637019498000086, -7.648727473999975, 0.0 ], [ 109.637186060000019, -7.64856685999992, 0.0 ], [ 109.637578670000082, -7.648281325, 0.0 ], [ 109.637739285000052, -7.648174248999942, 0.0 ], [ 109.637852309000081, -7.648049328, 0.0 ], [ 109.637923693000033, -7.647924405999965, 0.0 ], [ 109.637959385000059, -7.647817329999987, 0.0 ], [ 109.637971282000066, -7.647680511999947, 0.0 ], [ 109.637994, -7.64728, 0.0 ], [ 109.637971282000066, -7.646913134999958, 0.0 ], [ 109.638006973000088, -7.646800110999933, 0.0 ], [ 109.638099592000017, -7.646730520999948, 0.0 ], [ 109.638355565000055, -7.646691845999945, 0.0 ], [ 109.638491194, -7.64667042999995, 0.0 ], [ 109.638591132000016, -7.646627600999959, 0.0 ], [ 109.638683931000045, -7.646549076999945, 0.0 ], [ 109.638741038000063, -7.646427724999941, 0.0 ], [ 109.638748176000036, -7.646320648999963, 0.0 ], [ 109.638741038000063, -7.646213572999986, 0.0 ], [ 109.63866291300009, -7.646018164999894, 0.0 ], [ 109.638605408000032, -7.645774324999969, 0.0 ], [ 109.638591132000016, -7.645607762999954, 0.0 ], [ 109.638600649000082, -7.645412646999975, 0.0 ], [ 109.638614926000031, -7.645288914999951, 0.0 ], [ 109.63866251400006, -7.645169942999966, 0.0 ], [ 109.638743417000086, -7.645065244999919, 0.0 ], [ 109.638951584000083, -7.64479284699994, 0.0 ], [ 109.63901, -7.644659, 0.0 ], [ 109.639080999000043, -7.644499, 0.0 ], [ 109.639076, -7.644247, 0.0 ], [ 109.639038840000111, -7.644070307999931, 0.0 ], [ 109.638824319000037, -7.643442452999941, 0.0 ], [ 109.638810042, -7.643318720999917, 0.0 ], [ 109.638805283000053, -7.643190229999944, 0.0 ], [ 109.638848113000051, -7.643071256999959, 0.0 ], [ 109.638886185000089, -7.64301890899998, 0.0 ], [ 109.638990881000041, -7.642985596999977, 0.0 ], [ 109.639209791000042, -7.642966561, 0.0 ], [ 109.639418, -7.642961, 0.0 ], [ 109.639538000000101, -7.642826, 0.0 ], [ 109.639608, -7.642632, 0.0 ], [ 109.639502, -7.642229999999897, 0.0 ], [ 109.639448999000109, -7.641861, 0.0 ], [ 109.639521, -7.641359, 0.0 ], [ 109.639696, -7.640784, 0.0 ], [ 109.639735, -7.640687, 0.0 ], [ 109.6398964790001, -7.640255383999942, 0.0 ], [ 109.639949000000101, -7.640115, 0.0 ], [ 109.640035000000111, -7.63969800099992, 0.0 ], [ 109.640045, -7.639563998999935, 0.0 ], [ 109.640056, -7.639129, 0.0 ], [ 109.640174999000052, -7.638436, 0.0 ], [ 109.640189001000053, -7.637876, 0.0 ], [ 109.640276, -7.637854, 0.0 ], [ 109.640352, -7.637285, 0.0 ], [ 109.640372, -7.636954, 0.0 ], [ 109.640584999000055, -7.636606, 0.0 ], [ 109.640623, -7.636586, 0.0 ], [ 109.64090900100004, -7.636671, 0.0 ], [ 109.641281575000036, -7.636846724999905, 0.0 ], [ 109.641297, -7.636854000999974, 0.0 ], [ 109.6417450000001, -7.637164000999955, 0.0 ], [ 109.641981, -7.637401, 0.0 ], [ 109.642143999000083, -7.637783000999923, 0.0 ], [ 109.642160999000069, -7.638182, 0.0 ], [ 109.642086, -7.63880000099996, 0.0 ], [ 109.641993000000113, -7.639435, 0.0 ], [ 109.641937, -7.639907000999894, 0.0 ], [ 109.641937728000059, -7.639939255999898, 0.0 ], [ 109.641953, -7.640615000999943, 0.0 ], [ 109.64213, -7.641214, 0.0 ], [ 109.642268, -7.641479, 0.0 ], [ 109.642359508000055, -7.641520326999976, 0.0 ], [ 109.642671, -7.641661, 0.0 ], [ 109.643024, -7.641799, 0.0 ], [ 109.64346, -7.642254998999923, 0.0 ], [ 109.64375, -7.64271, 0.0 ], [ 109.644031001000073, -7.643169000999964, 0.0 ], [ 109.644367, -7.643365000999927, 0.0 ], [ 109.644731001000082, -7.643494, 0.0 ], [ 109.645678, -7.643805, 0.0 ], [ 109.646136023000068, -7.64397212699989, 0.0 ], [ 109.646808478000111, -7.644207469, 0.0 ], [ 109.647034084000026, -7.644287982, 0.0 ] ] ] } }
  ]
};

L.geoJSON(batasAdministrasiData, {
  style: { color: "#0000FF", weight: 3, opacity: 0.8, fill: false }
}).addTo(layerBatasAdmin);

// 4.6 Fasilitas Umum
const fasilitasUmumData = {
  "type": "FeatureCollection",
  "name": "fasilitas_umum",
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  "features": [
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "Musholla AL Hasanah" }, "geometry": { "type": "Point", "coordinates": [ 109.640295353616622, -7.666087615953089 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "Musholla Nurul Ikhkas" }, "geometry": { "type": "Point", "coordinates": [ 109.638157176883638, -7.664819714940282 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "Masjid Al HUDA" }, "geometry": { "type": "Point", "coordinates": [ 109.639793152634383, -7.657087451827928 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "Musholla Al-Hikmah" }, "geometry": { "type": "Point", "coordinates": [ 109.643127728383604, -7.650266470192302 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "Masjid Ka'bah Muria Al-Akhsan" }, "geometry": { "type": "Point", "coordinates": [ 109.640628849504679, -7.648386613773509 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "Musholla Al-Barokah" }, "geometry": { "type": "Point", "coordinates": [ 109.640019844356274, -7.64993554430024 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "Masjid Al-Ma'ruf" }, "geometry": { "type": "Point", "coordinates": [ 109.642544335292428, -7.647555404043954 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "Polindes Desa Karangpoh" }, "geometry": { "type": "Point", "coordinates": [ 109.643884400096681, -7.648493262096716 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "Masjid Nurul Huda" }, "geometry": { "type": "Point", "coordinates": [ 109.643768682534827, -7.645056919273705 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "Musholla Roudotul Mutaqqin" }, "geometry": { "type": "Point", "coordinates": [ 109.640928940906761, -7.638640045999918 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "Kantor Kepala Desa" }, "geometry": { "type": "Point", "coordinates": [ 109.642102971156262, -7.654145251239519 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "SDN 2 Karangpoh" }, "geometry": { "type": "Point", "coordinates": [ 109.642085853173739, -7.652463738646021 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "SDN 1 Karangpoh" }, "geometry": { "type": "Point", "coordinates": [ 109.639321852034513, -7.661920502266989 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "Lapangan Bola" }, "geometry": { "type": "Point", "coordinates": [ 109.641199020288113, -7.65875088867958 ] } },
      { "type": "Feature", "properties": { "Id": 0, "Keterangan": "SD Alam Karangpoh" }, "geometry": { "type": "Point", "coordinates": [ 109.640542458668023, -7.656631595395098 ] } }
  ]
};

L.geoJSON(fasilitasUmumData, {
  pointToLayer: function (feature, latlng) {
      return L.marker(latlng, { icon: getCustomIcon(feature.properties.Keterangan) });
  },
  onEachFeature: (feature, layer) => {
      const ket = feature.properties ? feature.properties.Keterangan : "-";
      const iconHtml = layer.options.icon.options.html;
      
      layer.bindPopup(
          `<div style="text-align:center; font-family:Arial; font-weight:bold; font-size:14px; margin:5px; color:#333;">
              <span style="font-size:24px; display:block; margin-bottom:5px;">${iconHtml}</span>
              ${ket}
          </div>`
      );
      layer.bindTooltip(ket);
  }
}).addTo(layerFasilitas);

// Tambahkan layer ke peta 
layerTutupanLahan.addTo(map);
layerAliranSungai.addTo(map);
layerJalan.addTo(map);
layerBatasAdmin.addTo(map);
layerFasilitas.addTo(map);

// --- 5. KONTROL LAYER & ZOOM ---
const baseMaps = {
  "OpenStreetMap": osm,
  "Google Maps": googleStreets,
  "Google Satellite": googleSat,
  "Peta Terrain": terrain,
};

const overlayMaps = {
  "Batas Administrasi": layerBatasAdmin,
  "Fasilitas Umum": layerFasilitas,
  "Tutupan Lahan": layerTutupanLahan,
  "Kemiringan Lereng": layerKemiringan,
  "Aliran Sungai": layerAliranSungai,
  "Jalan": layerJalan,
};

L.control.layers(baseMaps, overlayMaps, {
  position: 'topright',
  collapsed: false
}).addTo(map);

L.control.zoom({ position: "topright" }).addTo(map);
L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(map);

// --- 6. LEGENDA PETA ---
const legend = L.control({ position: "bottomright" });

legend.onAdd = function () {
  const div = L.DomUtil.create("div", "legend");

  let html = "<b>Batas & Fasilitas Umum</b>";
  html += '<div class="legend-item"><i style="background:#0000FF; height:4px; margin-top:5px;"></i>Batas Administrasi</div>';
  html += '<div class="legend-item"><i class="fas fa-mosque" style="background:none; box-shadow:none; color:#28a745; width:auto; font-size:15px; margin-right:8px;"></i>Masjid / Musholla</div>';
  html += '<div class="legend-item"><i class="fas fa-school" style="background:none; box-shadow:none; color:#fd7e14; width:auto; font-size:15px; margin-right:8px;"></i>Sekolah Dasar</div>';
  html += '<div class="legend-item"><i class="fas fa-clinic-medical" style="background:none; box-shadow:none; color:#dc3545; width:auto; font-size:15px; margin-right:8px;"></i>Polindes (Medis)</div>';
  html += '<div class="legend-item"><i class="fas fa-futbol" style="background:none; box-shadow:none; color:#6f42c1; width:auto; font-size:15px; margin-right:8px;"></i>Lapangan</div>';
  html += '<div class="legend-item"><i class="fas fa-landmark" style="background:none; box-shadow:none; color:#007bff; width:auto; font-size:15px; margin-right:8px;"></i>Kantor Desa</div>';

  html += "<b>Tutupan Lahan</b>";
  html += '<div class="legend-item"><i style="background:#4a90e2"></i>Air</div>';
  html += '<div class="legend-item"><i style="background:#3b823e"></i>Vegetasi</div>';
  html += '<div class="legend-item"><i style="background:#8b7bc6"></i>Vegetasi terendam air</div>';
  html += '<div class="legend-item"><i style="background:#e68a2e"></i>Tanaman</div>';
  html += '<div class="legend-item"><i style="background:#d3312c"></i>Area Terbangun</div>';
  html += '<div class="legend-item"><i style="background:#ab9e98"></i>Lahan Kosong</div>';
  html += '<div class="legend-item"><i style="background:#646464"></i>Awan</div>';
  html += '<div class="legend-item"><i style="background:#e8e5c4"></i>Padang Rumput</div>';

  html += "<b>Kemiringan Lereng</b>";
  html += '<div class="legend-item"><i style="background:#22c55e"></i>Datar (0-8%)</div>';
  html += '<div class="legend-item"><i style="background:#84cc16"></i>Landai (8-15%)</div>';
  html += '<div class="legend-item"><i style="background:#eab308"></i>Agak Curam (15-25%)</div>';
  html += '<div class="legend-item"><i style="background:#f97316"></i>Curam (25-45%)</div>';
  html += '<div class="legend-item"><i style="background:#ef4444"></i>Sangat Curam (>45%)</div>';

  html += "<b>Jaringan Air & Jalan</b>";
  html += '<div class="legend-item"><i style="background:#0284c7"></i>Aliran Sungai</div>';
  html += '<div class="legend-item"><i style="background:#dc2626"></i>Jalan Utama / Lain</div>';
  html += '<div class="legend-item"><i style="background:#7f1d1d"></i>Jalan Setapak</div>';

  div.innerHTML = html;
  
  L.DomEvent.disableClickPropagation(div);
  
  return div;
};

legend.addTo(map);

// =========================================================
// MENGAKTIFKAN FITUR DRAG PADA LEGENDA (VERSI KUAT)
// =========================================================
setTimeout(() => {
  const legendElement = document.querySelector(".legend");
  const legendContainer = legendElement ? legendElement.parentElement : null;

  if (legendElement && legendContainer) {
    // Membebaskan legenda dari layout bawaan Leaflet
    legendElement.style.position = 'absolute';
    legendElement.style.bottom = '10px'; // Jarak sedikit dari bawah
    legendElement.style.right = '10px';  // Jarak sedikit dari kanan

    const draggable = new L.Draggable(legendElement);
    draggable.enable();
    
    draggable.on("dragstart", function() {
      legendElement.style.cursor = "grabbing";
    });
    draggable.on("dragend", function() {
      legendElement.style.cursor = "grab";
    });
  }
}, 1000);

// =========================================================
// ANIMASI TRANSISI PINDAH HALAMAN (LEBIH CEPAT)
// =========================================================
document.addEventListener("DOMContentLoaded", function () {
  const transitionLinks = document.querySelectorAll("a[href='index.html'], a[href='peta.html']");

  transitionLinks.forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault(); 
      const targetUrl = this.href; 

      document.body.classList.add("fade-out");

      // Menunggu hanya 500 ms (0.5 detik)
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 500); 
    });
  });
});