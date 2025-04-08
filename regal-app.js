document.getElementById('fileInput').addEventListener('change', handleImageUpload);

let items = [];

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = function (e) {
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    img.onload = async function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        const { data: { text } } = await Tesseract.recognize(
            canvas,
            'ces',
            {
                logger: m => console.log(m)
            }
        );

        console.log('OCR text:', text);
        document.getElementById('ocr-result').innerText = text;

        const parsedItems = parseOCRText(text);
        items = items.concat(parsedItems);
        saveItemsToLocalStorage();
        renderItems();
    };
}

function parseOCRText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    const results = [];
    let rgCounter = 1;
    let zbCounter = 1;

    for (let line of lines) {
        const isRegal = line.includes('☒') || line.includes('X');
        const isZebrik = line.includes('☐');

        let type = null;
        if (isRegal) {
            type = `RG - ${rgCounter++}`;
        } else if (isZebrik) {
            type = `ŽB - ${zbCounter++}`;
        } else {
            continue; // neznámý řádek, přeskočíme
        }

        results.push({
            id: Date.now() + Math.random(),
            type,
            rawText: line
        });
    }

    return results;
}

function saveItemsToLocalStorage() {
    localStorage.setItem('inventoryItems', JSON.stringify(items));
}

function loadItemsFromLocalStorage() {
    const stored = localStorage.getItem('inventoryItems');
    if (stored) {
        items = JSON.parse(stored);
    }
}

function renderItems() {
    const container = document.getElementById('item-list');
    container.innerHTML = '';

    const regaly = items.filter(item => item.type.startsWith('RG'));
    const zebriky = items.filter(item => item.type.startsWith('ŽB'));

    const createSection = (title, data) => {
        const section = document.createElement('div');
        const h2 = document.createElement('h2');
        h2.innerText = title;
        section.appendChild(h2);

        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item';
            div.innerHTML = `
                <strong>${item.type}</strong>: ${item.rawText}<br>
                <button onclick="editItem('${item.id}')">Upravit</button>
                <button onclick="deleteItem('${item.id}')">Smazat</button>
            `;
            section.appendChild(div);
        });

        return section;
    };

    container.appendChild(createSection('Regály', regaly));
    container.appendChild(createSection('Žebříky', zebriky));
}

function editItem(id) {
    const item = items.find(i => i.id == id);
    const newText = prompt('Upravit záznam:', item.rawText);
    if (newText) {
        item.rawText = newText;
        saveItemsToLocalStorage();
        renderItems();
    }
}

function deleteItem(id) {
    items = items.filter(i => i.id != id);
    saveItemsToLocalStorage();
    renderItems();
}

// Načti položky při startu
loadItemsFromLocalStorage();
renderItems();
