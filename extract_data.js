const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname);
const content = fs.readFileSync(path.join(ROOT, 'db_seguit1.sql'), 'utf-8');
const lines = content.split('\n');

function parseTable(tableName, columns) {
  const rows = [];
  let collecting = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start collecting when we hit an INSERT for this table
    if (line.includes("INSERT INTO `" + tableName + "`")) {
      collecting = true;
      continue;
    }

    if (collecting) {
      const trimmed = line.trim();
      // Stop when we hit an empty line, comment, or new statement that isn't a continuation
      if (trimmed === '' || trimmed.startsWith('--') || trimmed.startsWith('/*')) {
        collecting = false;
        continue;
      }

      // Each data line starts with (
      if (trimmed.startsWith('(')) {
        // Remove trailing comma or semicolon
        let rowLine = trimmed;
        if (rowLine.endsWith(',')) rowLine = rowLine.slice(0, -1);
        if (rowLine.endsWith(';')) rowLine = rowLine.slice(0, -1);

        // Could have multiple rows on one line: (...),(...),(...)
        // Split by ),( carefully
        const rowTexts = splitRows(rowLine);

        for (const rt of rowTexts) {
          const vals = splitValues(rt);
          if (vals.length === columns.length) {
            const obj = {};
            columns.forEach((col, idx) => {
              let v = vals[idx];
              if (v === null) { obj[col] = null; return; }
              if (typeof v === 'string' && /^\d+$/.test(v)) { obj[col] = parseInt(v); return; }
              if (typeof v === 'string' && /^\d+\.\d+$/.test(v)) { obj[col] = parseFloat(v); return; }
              obj[col] = v;
            });
            rows.push(obj);
          }
        }
      }
    }
  }
  return rows;
}

// Split "(...),(...),(...)" into individual row contents
function splitRows(line) {
  const results = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === '(') {
      let depth = 1;
      let start = i + 1;
      let inStr = false;
      i++;
      while (i < line.length && depth > 0) {
        if (line[i] === '\\' && inStr) { i += 2; continue; }
        if (line[i] === "'" && !(i > 0 && line[i-1] === '\\')) inStr = !inStr;
        if (!inStr) {
          if (line[i] === '(') depth++;
          if (line[i] === ')') depth--;
        }
        if (depth > 0) i++;
      }
      results.push(line.substring(start, i));
      i++; // skip )
    } else {
      i++;
    }
  }
  return results;
}

// Split comma-separated values respecting quoted strings
function splitValues(str) {
  const vals = [];
  let current = '';
  let inStr = false;
  let i = 0;

  while (i < str.length) {
    const ch = str[i];

    if (ch === '\\' && inStr) {
      if (i + 1 < str.length) {
        const next = str[i + 1];
        if (next === 'n') current += '\n';
        else if (next === 'r') current += '\r';
        else if (next === 't') current += '\t';
        else if (next === "'") current += "'";
        else if (next === '\\') current += '\\';
        else current += next;
        i += 2;
        continue;
      }
    }

    if (ch === "'") {
      if (!inStr) {
        inStr = true;
        i++;
        continue;
      } else {
        // Check for ''
        if (i + 1 < str.length && str[i + 1] === "'") {
          current += "'";
          i += 2;
          continue;
        }
        inStr = false;
        i++;
        continue;
      }
    }

    if (ch === ',' && !inStr) {
      vals.push(current.trim() === 'NULL' ? null : current.trim());
      current = '';
      i++;
      // skip space after comma
      while (i < str.length && str[i] === ' ') i++;
      continue;
    }

    current += ch;
    i++;
  }
  vals.push(current.trim() === 'NULL' ? null : current.trim());
  return vals;
}

// === EXTRACT ALL TABLES ===
console.log('Extrayendo datos de db_seguit1.sql...\n');

const data = {
  _meta: {
    source: 'db_seguit1.sql',
    exported: new Date().toISOString(),
    description: 'Export completo de datos seguit v1 para migracion a PROSEGUIT v2'
  },
  equipo: parseTable('equipo', ['id','serie','modelo','ubicacion','ubicacion_tmp','tipo','url_image','observacion','ip']),
  tipo: parseTable('tipo', ['id','nombre']),
  ubicacion: parseTable('ubicacion', ['id','nombre']),
  historial: parseTable('historial', ['id','serie','ubicacion','fecha','observacion','comentario','usuario']),
  usuario: parseTable('usuario', ['id','nombre','id_ubicacion','ficha','pass','rol']),
  funcionarios: parseTable('funcionarios', ['ficha','nombre']),
  prestamo: parseTable('prestamo', ['id','serie','ubicacion','fec_pres','fec_dev','solicitante','tecnico','func_dev','tec_dev','activo']),
  servicio: parseTable('servicio', ['id','nombre']),
  estado: parseTable('estado', ['id','nombre','color']),
  tema: parseTable('tema', ['id','nombre','icono','color','activo']),
  errores: parseTable('errores', ['id','programa','titulo','fecha','descripcion','activo']),
};

// Summary
console.log('=== Resumen de datos extraidos ===');
let totalRows = 0;
Object.entries(data).forEach(([key, val]) => {
  if (key === '_meta') return;
  const count = Array.isArray(val) ? val.length : 0;
  totalRows += count;
  console.log(`  ${key}: ${count} registros`);
});
console.log(`\n  TOTAL: ${totalRows} registros`);

// Save JSON
fs.writeFileSync(
  path.join(ROOT, 'export_datos_v1.json'),
  JSON.stringify(data, null, 2),
  'utf-8'
);
console.log('\n-> Guardado: export_datos_v1.json');

// Save readable summary
let summary = '# PROSEGUIT - Datos exportados de seguit v1\n';
summary += `# Fecha: ${new Date().toISOString()}\n`;
summary += `# Total registros: ${totalRows}\n\n`;

summary += `## TIPOS DE EQUIPO (${data.tipo.length})\n`;
summary += 'ID | Nombre\n';
summary += '---|-------\n';
data.tipo.forEach(t => summary += `${t.id} | ${t.nombre}\n`);

summary += `\n## UBICACIONES (${data.ubicacion.length})\n`;
summary += 'ID | Nombre\n';
summary += '---|-------\n';
data.ubicacion.forEach(u => summary += `${u.id} | ${u.nombre}\n`);

summary += `\n## USUARIOS (${data.usuario.length})\n`;
summary += 'ID | Nombre | Ficha | Rol\n';
summary += '---|--------|-------|----\n';
data.usuario.forEach(u => summary += `${u.id} | ${u.nombre} | ${u.ficha} | ${u.rol === 1 ? 'Admin' : 'Tecnico'}\n`);

summary += `\n## FUNCIONARIOS (${data.funcionarios.length})\n`;
summary += 'Ficha | Nombre\n';
summary += '------|-------\n';
data.funcionarios.forEach(f => summary += `${f.ficha} | ${f.nombre}\n`);

summary += `\n## SERVICIOS EXTERNOS (${data.servicio.length})\n`;
data.servicio.forEach(s => summary += `${s.id} | ${s.nombre}\n`);

summary += `\n## EQUIPOS (${data.equipo.length} registros)\n`;
summary += 'ID | Serie | Modelo | Ubicacion | Tipo | IP | Observacion\n';
summary += '---|-------|--------|-----------|------|----|------------\n';
data.equipo.forEach(e => {
  const tipoName = (data.tipo.find(t => t.id === e.tipo) || {}).nombre || e.tipo;
  const ubName = (data.ubicacion.find(u => u.id === e.ubicacion) || {}).nombre || e.ubicacion_tmp;
  const obs = String(e.observacion || '').replace(/\n/g, ' ').substring(0, 80);
  summary += `${e.id} | ${e.serie} | ${e.modelo} | ${ubName} | ${tipoName} | ${e.ip || ''} | ${obs}\n`;
});

summary += `\n## PRESTAMOS (${data.prestamo.length} registros)\n`;
summary += 'ID | Serie | Ubicacion | Fecha Prest | Fecha Dev | Solicitante | Tecnico | Estado\n';
summary += '---|-------|-----------|-------------|-----------|-------------|---------|-------\n';
data.prestamo.forEach(p => {
  const estado = p.fec_dev === '1900-01-01' ? 'PENDIENTE' : 'Devuelto';
  const ubName = (data.ubicacion.find(u => u.id === p.ubicacion) || {}).nombre || p.ubicacion;
  summary += `${p.id} | ${p.serie} | ${ubName} | ${p.fec_pres} | ${p.fec_dev} | ${p.solicitante} | ${p.tecnico} | ${estado}\n`;
});

summary += `\n## HISTORIAL (${data.historial.length} registros) - Primeros y ultimos 20\n`;
summary += 'ID | Serie | Ubicacion | Fecha | Observacion | Usuario\n';
summary += '---|-------|-----------|-------|-------------|--------\n';
const firstH = data.historial.slice(0, 20);
const lastH = data.historial.slice(-20);
firstH.forEach(h => summary += `${h.id} | ${h.serie} | ${h.ubicacion} | ${h.fecha} | ${(h.observacion||'').substring(0,50)} | ${h.usuario}\n`);
summary += '... (ver export_datos_v1.json para historial completo) ...\n';
lastH.forEach(h => summary += `${h.id} | ${h.serie} | ${h.ubicacion} | ${h.fecha} | ${(h.observacion||'').substring(0,50)} | ${h.usuario}\n`);

fs.writeFileSync(
  path.join(ROOT, 'resumen_datos_v1.txt'),
  summary,
  'utf-8'
);
console.log('-> Guardado: resumen_datos_v1.txt');

// Stats
console.log('\n=== Equipos por tipo ===');
const byType = {};
data.equipo.forEach(e => {
  const tName = (data.tipo.find(t => t.id === e.tipo) || {}).nombre || 'Desconocido';
  byType[tName] = (byType[tName] || 0) + 1;
});
Object.entries(byType).sort((a,b) => b[1]-a[1]).forEach(([t,c]) => console.log(`  ${t}: ${c}`));

console.log('\n=== Top 20 ubicaciones con mas equipos ===');
const byLoc = {};
data.equipo.forEach(e => {
  const uName = (data.ubicacion.find(u => u.id === e.ubicacion) || {}).nombre || e.ubicacion_tmp || 'Desconocida';
  byLoc[uName] = (byLoc[uName] || 0) + 1;
});
Object.entries(byLoc).sort((a,b) => b[1]-a[1]).slice(0, 20).forEach(([l,c]) => console.log(`  ${l}: ${c}`));

// File sizes
const jsonSize = (fs.statSync(path.join(ROOT, 'export_datos_v1.json')).size / 1024).toFixed(1);
const txtSize = (fs.statSync(path.join(ROOT, 'resumen_datos_v1.txt')).size / 1024).toFixed(1);
console.log(`\n=== Archivos generados ===`);
console.log(`  export_datos_v1.json: ${jsonSize} KB`);
console.log(`  resumen_datos_v1.txt: ${txtSize} KB`);
