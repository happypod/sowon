const url = "https://script.google.com/macros/s/AKfycbyQlf6KWqqSnNGaDE7S_7wbooNHrTgY1jD434vQSIRSa5JPkrvk0nV_fbZdeE6QW7Wq/exec";

async function submit(formType, runCount) {
    const payload = {
        formType: formType,
        Q1: "test1",
        Q2: "test2",
        NAME: "Tester_" + runCount,
        DOB: "900101",
        PHONE: "1234",
        consent: "동의함"
    };

    console.log(`Submitting ${formType} run ${runCount}...`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            redirect: "follow",
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const result = await response.text();
        console.log(`Result ${formType} ${runCount}:`, result);
    } catch (e) {
        console.error(`Error ${formType} ${runCount}:`, e);
    }
}

async function run() {
    for (const type of ['resident', 'tourist', 'lodging']) {
        await submit(type, 1);
        await submit(type, 2);
    }
}

run();
