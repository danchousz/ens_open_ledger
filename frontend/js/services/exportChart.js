import { navigator } from "../modules/navigator.js";

function generateFileName(format, recipient) {
    let fileName = '';
    if (recipient) {
        fileName += `${recipient}.${format}`;
    } else {
        if (navigator.currentView === 'big_picture') {
            fileName = `big_picture_ledger.${format}`;
        } else if (navigator.currentView === 'quarter') {
            fileName = `${navigator.currentQuarter}_ledger.${format}`;
        } else if (navigator.currentView === 'wallet') {
            const formattedWallet = navigator.walletFilter.replace(/ /g, '_');
            fileName = `${formattedWallet}_${navigator.currentQuarter}_ledger.${format}`;
        }
    }
    return fileName;
}

function saveAsCSV(data, recipient) {
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const fileName = generateFileName('csv', recipient);
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function saveAsXLSX(data, recipient) {
    const fileName = generateFileName('xlsx', recipient);
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, fileName);
}

function saveAsJSON(data, recipient) {
    const fileName = generateFileName('json', recipient);
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export function exportDataByPeriod(format) {    
    fetch(`/export-data?view=${navigator.currentView}&filter=${navigator.walletFilter}&quarter=${navigator.currentQuarter}`)
        .then(response => response.json())
        .then(data => {
            const filteredData = data
                .filter(row => row.From_name !== 'Plchld' && row.To_name !== 'Plchld')
                .sort((a, b) => new Date(a.Date) - new Date(b.Date));

            const formattedData = filteredData.map(row => ({
                'Transaction Hash': row['Transaction Hash'],
                'Date': row.Date,
                'Quarter': row.Quarter,
                'From': row.From_name,
                'To': row.To_name,
                'Category': row.To_category,
                'Amount': row.Value,
                'Asset': row.Symbol,
                'Value': row.DOT_USD
            }));
            
            switch (format) {
                case 'csv':
                    saveAsCSV(formattedData, false);
                    break;
                case 'xlsx':
                    saveAsXLSX(formattedData, false);
                    break;
                case 'json':
                    saveAsJSON(formattedData, false);
                    break;
            }
        });
}


export function exportTableByEntity(format, transactions, recipientName) {
    const tableData = transactions.map(tx => ({
        'Transaction Hash': tx['Transaction Hash'],
        'Date': tx.Date,
        'Quarter': tx.Quarter,
        'From': tx.From_name,
        'To': tx.To_name,
        'Category': tx.To_category,
        'Amount': tx.Value,
        'Asset': tx.Symbol,
        'Value': tx.DOT_USD
    }));

    switch (format) {
        case 'xlsx':
            saveAsXLSX(tableData, recipientName);
            break;
        case 'csv':
            saveAsCSV(tableData, recipientName);
            break;
        case 'json':
            saveAsJSON(tableData, recipientName);
            break;
    }
}

export function exportCustomSVG(format = 'svg', chartElement) {
    const sankeyDiv = document.getElementById('sankeyDiagram');
    const targetElement = chartElement || sankeyDiv;
    const plotSVG = targetElement.getElementsByTagName('svg')[0];
    const gd = targetElement._fullLayout;

    const shapes = navigator.currentView === 'big_picture' ? gd.shapes : [];
    const annotations = navigator.currentView === 'big_picture' ? gd.annotations : [];

    const svgCopy = plotSVG.cloneNode(true);

    const nodeLabels = svgCopy.querySelectorAll('.node-label');
    nodeLabels.forEach(label => {
        label.style.fontFamily = 'Satoshi, sans-serif';
    });

    let width = parseFloat(svgCopy.getAttribute('width'));
    let height = parseFloat(svgCopy.getAttribute('height'));

    const isFromCategoryModal = chartElement && chartElement.id === 'categorySankeyChart';

    if (!isFromCategoryModal && navigator.currentView === 'big_picture') {
        const maxHeight = 2000;
        if (height > maxHeight) {
            height = maxHeight;
            svgCopy.setAttribute('height', height);
            svgCopy.setAttribute('viewBox', `0 0 ${width} ${height}`);
            
            const clipPath = svgCopy.querySelector('clipPath');
            if (clipPath) {
                const rect = clipPath.querySelector('rect');
                if (rect) {
                    rect.setAttribute('height', height);
                }
            }
        }
    }

    const overlayGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    overlayGroup.setAttribute('class', 'overlay-group');

    shapes.forEach((shape, index) => {
        const shapeElem = createSVGShape(shape, width, height);
        if (shapeElem) {
            overlayGroup.appendChild(shapeElem);
        }
    });

    annotations.forEach((annotation, index) => {
        const annotationElem = createSVGAnnotation(annotation, width, height);
        if (annotationElem) {
            overlayGroup.appendChild(annotationElem);
        }
    });

    svgCopy.appendChild(overlayGroup);

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgCopy);
    
    svgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
                '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
                svgString;

    if (format === 'svg') {
        const blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(blob);

        let fileName;
        if (isFromCategoryModal) {
            const title = document.getElementById('categorySankeyTitle').textContent;
            fileName = `${title.replace(' - ', '_')}.svg`;
        } else {
            fileName = generateFileName('svg');
        }
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute("download", fileName);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    } else if (format === 'png') {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(img, 0, 0);

            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);

                let fileName;
                if (isFromCategoryModal) {
                    const title = document.getElementById('categorySankeyTitle').textContent;
                    fileName = `${title.replace(' - ', '_')}.png`;
                } else {
                    fileName = generateFileName('png');
                }
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute("download", fileName);
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(url);
            }, 'image/png');
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    }

    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Satoshi:wght@400;700&display=swap');
        text, .node-label {
            font-family: 'Satoshi', sans-serif !important;
        }
    `;
    svgCopy.insertBefore(style, svgCopy.firstChild);
}

function createSVGShape(shape, width, height) {
    const svgns = "http://www.w3.org/2000/svg";
    let elem;

    try {
        if (shape.type === 'line') {
            elem = document.createElementNS(svgns, 'line');
            
            if (shape.x0 === shape.x1) {
                elem.setAttribute('x1', shape.x0 * width);
                elem.setAttribute('y1', 0);
                elem.setAttribute('x2', shape.x1 * width);
                elem.setAttribute('y2', height);
            } 
            else if (shape.y0 === shape.y1) {
                elem.setAttribute('x1', 0);
                elem.setAttribute('x2', width);
                elem.setAttribute('y1', 0.05 * height);
                elem.setAttribute('y2', 0.05 * height);
            }
        } else {
            elem = document.createElementNS(svgns, 'rect');
            elem.setAttribute('x', shape.x0 * width);
            elem.setAttribute('y', shape.y0 * height);
            elem.setAttribute('width', (shape.x1 - shape.x0) * width);
            elem.setAttribute('height', (shape.y1 - shape.y0) * height);
        }

        if (elem) {
            elem.setAttribute('fill', shape.fillcolor || 'none');
            elem.setAttribute('stroke', shape.line.color || 'black');
            elem.setAttribute('stroke-width', shape.line.width || 1);
            elem.setAttribute('vector-effect', 'non-scaling-stroke');
        }
    } catch (error) {
        console.error('Error creating shape:', error);
        return null;
    }

    return elem;
}

function createSVGAnnotation(annotation, width, height) { 
    const svgns = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(svgns, 'g');

    try {
        let x;
        let y;
                    
        const text = document.createElementNS(svgns, 'text');
        text.textContent = annotation.text;

        if (text.textContent.startsWith('2')) {
            y = 0.01 * height;
        } else {
            y = 0.03 * height;
        }
        x = (annotation.x - 0.0075) * width;
        
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('text-anchor', annotation.xanchor);
        text.setAttribute('dominant-baseline', 'hanging');
        text.setAttribute('font-family', 'satoshi');
        text.setAttribute('font-size', `${annotation.font.size}px`);
        text.setAttribute('fill', annotation.font.color);

        if (annotation.textangle) {
            text.setAttribute('transform', `rotate(${annotation.textangle}, ${x}, ${y})`);
        }

        g.appendChild(text);

    } catch (error) {
        console.error('Error creating annotation:', error);
        return null;
    }

    return g;
}