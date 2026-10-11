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

// Menyesuaikan kategori dan warna dengan gambar QGIS (landcover) yang baru
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

// --- 4. LOAD DATA GEOJSON ---
const layerKemiringan = L.layerGroup();
const layerTutupanLahan = L.layerGroup();
const layerAliranSungai = L.layerGroup();
const layerJalan = L.layerGroup();

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
        
        // Coba cari kolom standar
        const kemungkinanKolom = ["Name", "NAME", "tutupan", "TUTUPAN", "guna_lahan", "Guna_Lahan", "kategori", "Kategori", "jenis", "Jenis", "REMARK", "KETERANGAN", "LANDUSE", "NAMOBJ", "kelas", "Layer"];
        for (let kolom of kemungkinanKolom) {
          if (p[kolom]) {
            jenis = p[kolom].toString().trim();
            break;
          }
        }

        // Jika tidak ketemu, ambil nilai teks pertama
        if (!jenis) {
          for (let key in p) {
            if (typeof p[key] === 'string' && isNaN(p[key])) {
              jenis = p[key].toString().trim();
              break;
            }
          }
        }
        
        if (!jenis) jenis = "Tidak Diketahui"; // Fallback akhir

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

// Tambahkan layer ke peta 
layerTutupanLahan.addTo(map);
layerAliranSungai.addTo(map);
layerJalan.addTo(map);

// --- 5. KONTROL LAYER & ZOOM ---
const baseMaps = {
  "OpenStreetMap": osm,
  "Google Maps": googleStreets,
  "Google Satellite": googleSat,
  "Peta Terrain": terrain,
};

const overlayMaps = {
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

  // Legenda Tutupan Lahan disesuaikan persis dengan susunan & warna QGIS landcover
  let html = "<b>Tutupan Lahan</b>";
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
  return div;
};

legend.addTo(map);