// Using Chart.js instead of Plotly because it's more interactive and beautiful
export function drawTablePieChart(chartId, data) {
    const ctx = document.getElementById(chartId).getContext('2d');
    const dataValues = Object.values(data);
    const piecesCount = dataValues.length;
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: dataValues,
                backgroundColor: Object.keys(data).map((_, index) => 
                    `hsl(${index * 360 / Object.keys(data).length}, 70%, 60%)`
                ),
                borderWidth: 3/piecesCount
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            label += `${percentage}% (${value.toFixed(2)} USD)`;
                            return label;
                        }
                    }
                }
            }
        },
        plugins: [{
            afterDraw: function(chart) {
                var ctx = chart.ctx;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                var chartArea = chart.chartArea;
                var centerX = (chartArea.left + chartArea.right) / 2;
                var centerY = (chartArea.top + chartArea.bottom) / 2;

                chart.data.datasets.forEach(function(dataset, datasetIndex) {
                    var meta = chart.getDatasetMeta(datasetIndex);
                    meta.data.forEach(function(element, index) {
                        var model = element;
                        var total = dataset.data.reduce((a, b) => a + b, 0);
                        var percentage = Math.round((dataset.data[index] / total) * 100);
                        var midAngle = element.startAngle + (element.endAngle - element.startAngle) / 2;
                        var x = centerX + Math.cos(midAngle) * (chart.outerRadius / 2);
                        var y = centerY + Math.sin(midAngle) * (chart.outerRadius / 2);

                        ctx.fillStyle = '#000';
                        ctx.font = 'bold 0.857vw satoshi';
                        ctx.fillText(percentage + '%', x, y);
                    });
                });
                ctx.restore();
            },
            // Currently not using legend plugin since you can read the headers by hovering over the chart

            // afterRender: function(chart) {
            //     const legendContainer = document.getElementById(`${chart.canvas.id}Legend`);
            //     legendContainer.innerHTML = '';

            //     const itemsPerRow = 3;
            //     let currentRow;

            //     chart.legend.legendItems.forEach((item, index) => {
            //         if (index % itemsPerRow === 0) {
            //             currentRow = document.createElement('div');
            //             currentRow.style.display = 'flex';
            //             currentRow.style.justifyContent = 'center';
            //             currentRow.style.width = '100%';
            //             currentRow.style.marginBottom = '0.305vw';
            //             legendContainer.appendChild(currentRow);
            //         }

            //         const legendItem = document.createElement('div');
            //         legendItem.style.display = 'flex';
            //         legendItem.style.alignItems = 'center';
            //         legendItem.style.marginRight = '0.71vw';
            //         legendItem.style.fontSize = '1vw';

            //         const colorBox = document.createElement('span');
            //         colorBox.style.width = '0.71vw';
            //         colorBox.style.height = '0.71vw';
            //         colorBox.style.backgroundColor = item.fillStyle;
            //         colorBox.style.marginRight = '0.305vw';

            //         const label = document.createElement('span');
            //         label.textContent = item.text;

            //         legendItem.appendChild(colorBox);
            //         legendItem.appendChild(label);
            //         currentRow.appendChild(legendItem);
            //     });
            // }
        }]
    });
}