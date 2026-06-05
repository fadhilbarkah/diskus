const tests = ["truex", "nullx", "\"ok\"x", "1234x", "falsex"];
for (const t of tests) {
  try {
    JSON.parse(t);
  } catch(e) {
    console.log(`String: ${t} -> Error: ${e.message}`);
  }
}
