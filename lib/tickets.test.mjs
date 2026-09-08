import test from "node:test";
import assert from "node:assert/strict";
import {
  parseEstado,
  validateTicket,
  puedeVerTicket,
  hayNovedad,
  normalizarRespuesta,
  avisoDeTicket,
  idDeTicket,
  hayQueAvisar,
} from "./tickets.ts";

test("acepta un ticket válido y recorta espacios", () => {
  const result = validateTicket({
    tipo: "bug",
    prioridad: "alta",
    titulo: "  No guarda la factura ",
    detalle: "Tira error 500 al guardar.",
    url: "",
    reporta: " Ana ",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.titulo, "No guarda la factura");
  assert.equal(result.value.url, undefined);
  assert.equal(result.value.reporta, "Ana");
});

test("rechaza tipo y prioridad fuera de la lista", () => {
  const base = { titulo: "x", detalle: "y", prioridad: "media", tipo: "bug" };
  assert.equal(validateTicket({ ...base, tipo: "otro" }).ok, false);
  assert.equal(validateTicket({ ...base, prioridad: "urgente" }).ok, false);
});

test("rechaza título vacío o detalle demasiado largo", () => {
  const base = { tipo: "mejora", prioridad: "baja", titulo: "Algo", detalle: "ok" };
  assert.equal(validateTicket({ ...base, titulo: "   " }).ok, false);
  assert.equal(validateTicket({ ...base, detalle: "a".repeat(5001) }).ok, false);
});

test("acepta email válido y rechaza el inválido", () => {
  const base = { tipo: "bug", prioridad: "media", titulo: "Algo", detalle: "pasa" };
  const ok = validateTicket({ ...base, email: " ana@example.com " });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.email, "ana@example.com");
  assert.equal(validateTicket({ ...base, email: "no-es-mail" }).ok, false);
  assert.equal(validateTicket({ ...base, email: "" }).value.email, undefined);
});

test("parseEstado sólo acepta estados conocidos", () => {
  assert.equal(parseEstado("en_curso"), "en_curso");
  assert.equal(parseEstado("inventado"), null);
});

test("el admin ve el ticket de cualquier cliente", () => {
  assert.equal(puedeVerTicket({ rol: "admin" }, "Panadería Sol"), true);
});

test("el cliente ve sólo sus propios tickets", () => {
  assert.equal(puedeVerTicket({ rol: "cliente", nombre: "Panadería Sol" }, "Panadería Sol"), true);
  assert.equal(puedeVerTicket({ rol: "cliente", nombre: "Panadería Sol" }, "Otra SRL"), false);
});

test("no hay novedad si no cambian ni el estado ni la respuesta", () => {
  assert.equal(hayNovedad({ estado: "abierto", respuesta: null }, "abierto", null), false);
  assert.equal(hayNovedad({ estado: "abierto", respuesta: "Ya está" }, "abierto", "Ya está"), false);
});

test("hay novedad si cambia el estado", () => {
  assert.equal(hayNovedad({ estado: "abierto", respuesta: null }, "en_curso", null), true);
});

test("hay novedad si cambia sólo la respuesta", () => {
  assert.equal(hayNovedad({ estado: "abierto", respuesta: null }, "abierto", "Lo miro hoy"), true);
  assert.equal(hayNovedad({ estado: "abierto", respuesta: "Viejo" }, "abierto", "Nuevo"), true);
});

test("una respuesta vacía y una ausente son lo mismo", () => {
  assert.equal(hayNovedad({ estado: "abierto", respuesta: null }, "abierto", ""), false);
  assert.equal(hayNovedad({ estado: "abierto", respuesta: "" }, "abierto", null), false);
});

test("hay novedad si cambian el estado y la respuesta a la vez", () => {
  assert.equal(hayNovedad({ estado: "abierto", respuesta: "Viejo" }, "resuelto", "Nuevo"), true);
});

test("borrar una respuesta que ya estaba es novedad", () => {
  assert.equal(hayNovedad({ estado: "abierto", respuesta: "Viejo" }, "abierto", null), true);
  assert.equal(hayNovedad({ estado: "abierto", respuesta: "Viejo" }, "abierto", ""), true);
});

test("hayNovedad no confunde estados distintos con la misma respuesta", () => {
  assert.equal(hayNovedad({ estado: "resuelto", respuesta: "Listo" }, "cerrado", "Listo"), true);
  assert.equal(hayNovedad({ estado: "cerrado", respuesta: "Listo" }, "cerrado", "Listo"), false);
});

test("el nombre del cliente se compara exacto, sin normalizar", () => {
  assert.equal(puedeVerTicket({ rol: "cliente", nombre: "panadería sol" }, "Panadería Sol"), false);
  assert.equal(puedeVerTicket({ rol: "cliente", nombre: "Panadería Sol " }, "Panadería Sol"), false);
});

test("el admin ve el ticket aunque el cliente venga vacío", () => {
  assert.equal(puedeVerTicket({ rol: "admin" }, ""), true);
});

test("un cliente sin nombre no ve el ticket de un cliente con nombre", () => {
  assert.equal(puedeVerTicket({ rol: "cliente", nombre: "" }, "Panadería Sol"), false);
});

test("sin campo respuesta se conserva la que ya había", () => {
  assert.equal(normalizarRespuesta(null, "Ya estaba"), "Ya estaba");
  assert.equal(normalizarRespuesta(undefined, "Ya estaba"), "Ya estaba");
  assert.equal(normalizarRespuesta(null, null), null);
});

test("una respuesta en blanco borra la anterior", () => {
  assert.equal(normalizarRespuesta("", "Ya estaba"), null);
  assert.equal(normalizarRespuesta("   ", "Ya estaba"), null);
});

test("la respuesta se recorta y se limita a 5000", () => {
  assert.equal(normalizarRespuesta("  Lo miro hoy  ", null), "Lo miro hoy");
  assert.equal(normalizarRespuesta("x".repeat(6000), null).length, 5000);
});

const pedido = { id: 12, titulo: "No guarda la factura", reporta: "Ana", respuesta: "Lo miro hoy" };

test("si cambió el estado, el aviso dice a cuál pasó", () => {
  const { subject, body } = avisoDeTicket(pedido, "en_curso", true);
  assert.equal(subject, "Tu pedido #12 está en curso: No guarda la factura");
  assert.equal(body[2], 'El pedido #12 "No guarda la factura" pasó a En curso.');
});

test("si sólo cambió la respuesta, el aviso no inventa un cambio de estado", () => {
  const { subject, body } = avisoDeTicket(pedido, "abierto", false);
  assert.equal(subject, "Novedad en tu pedido #12: No guarda la factura");
  assert.equal(body[2], 'Hay una respuesta nueva en el pedido #12 "No guarda la factura".');
  assert.ok(!body.some((linea) => linea?.includes("pasó a")));
});

test("el aviso saluda con el nombre sólo si lo hay", () => {
  assert.equal(avisoDeTicket(pedido, "abierto", false).body[0], "Hola Ana,");
  assert.equal(avisoDeTicket({ ...pedido, reporta: null }, "abierto", false).body[0], "Hola,");
});

test("la respuesta va al final del aviso, y sin respuesta no queda línea vacía", () => {
  assert.equal(avisoDeTicket(pedido, "abierto", false).body.at(-1), "\nLo miro hoy");
  assert.equal(avisoDeTicket({ ...pedido, respuesta: null }, "abierto", false).body.at(-1), null);
});

test("lo que no es texto no se convierte en respuesta", () => {
  // Un POST a mano puede mandar un archivo en ese campo: `String(archivo)`
  // guardaría "[object File]" y se lo mandaría por mail al cliente.
  assert.equal(normalizarRespuesta(new File(["x"], "a.png"), "Ya estaba"), "Ya estaba");
  assert.equal(normalizarRespuesta(42, null), null);
  assert.equal(normalizarRespuesta({}, "Ya estaba"), "Ya estaba");
});

test("idDeTicket acepta sólo lo que puede ser un serial", () => {
  assert.equal(idDeTicket("12"), 12);
  assert.equal(idDeTicket("2147483647"), 2147483647);
});

test("idDeTicket rechaza lo que rompería la consulta", () => {
  assert.equal(idDeTicket("abc"), null);
  assert.equal(idDeTicket(""), null);
  assert.equal(idDeTicket("0"), null);
  assert.equal(idDeTicket("-1"), null);
  assert.equal(idDeTicket("1.5"), null);
  // Fuera del rango de int4: postgres tiraría error, no "no encontrado".
  assert.equal(idDeTicket("2147483648"), null);
});

test("borrar una respuesta se guarda pero no se avisa", () => {
  // Decirle al cliente "hay una respuesta nueva" cuando la respuesta se borró
  // le manda un mail a leer algo que no está.
  assert.equal(hayQueAvisar(false, null), false);
  assert.equal(hayQueAvisar(false, "Lo miro hoy"), true);
});

test("un cambio de estado siempre se avisa, con o sin respuesta", () => {
  assert.equal(hayQueAvisar(true, null), true);
  assert.equal(hayQueAvisar(true, "Listo"), true);
});

test("idDeTicket sólo acepta la forma canónica del número", () => {
  // Todas éstas serían otra URL para el mismo ticket.
  assert.equal(idDeTicket("0x10"), null);
  assert.equal(idDeTicket("1e3"), null);
  assert.equal(idDeTicket(" 12"), null);
  assert.equal(idDeTicket("+12"), null);
  assert.equal(idDeTicket("12.0"), null);
});
