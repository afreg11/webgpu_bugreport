mocha.setup('bdd');
    
mocha.timeout(1000000);
mocha.checkLeaks();
import("./tests.js").then(result => {
    result.default();
});