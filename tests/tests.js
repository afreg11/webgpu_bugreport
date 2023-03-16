
export default async function runTests() {
    await import("./tests/bugreport/test_bugrep.ts");
    mocha.run();
}