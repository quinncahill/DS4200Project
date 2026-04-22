const width = 270;
const height = 300;
const margin = { top: 20, right: 20, bottom: 40, left: 50 };

d3.csv("airbnb.csv").then(data => {
    data.forEach(d => {
        d.distance_city_center = +d.distance_city_center;
        d.price_total = +d.price_total;
    });

    const roomTypes = Array.from(new Set(data.map(d => d.room_type)));

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.distance_city_center))
        .range([margin.left, width - margin.right]);

    const binsGenerator = d3.bin()
        .value(d => d.distance_city_center)
        .domain(x.domain())
        .thresholds(20);

    const container = d3.select("#charts");

    // Used for colors
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c'];
    let colorIndex = 0;

    const charts = [];
    const brushes = [];

    const brush = d3.brushX()
        .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
        .on("brush end", brushed);

    roomTypes.forEach(room => {
        const roomData = data.filter(d => d.room_type === room);
        const bins = binsGenerator(roomData);

        bins.forEach(bin => {
            bin.avgPrice = d3.mean(bin, d => d.price_total) || 0;
        });

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.avgPrice)])
            .nice()
            .range([height - margin.bottom, margin.top]);

        const wrapper = container.append("div")
            .attr("class", "facet");

        const svg = wrapper.append("svg")
            .attr("width", width)
            .attr("height", height);

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .text(room);

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height - 5)
            .attr("text-anchor", "middle")
            .text("Distance to City Center (km)");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .text("Average Price (€)");

        const area = d3.area()
            .x(d => x((d.x0 + d.x1) / 2))
            .y0(y(0))
            .y1(d => y(d.avgPrice));

        const line = d3.line()
            .x(d => x((d.x0 + d.x1) / 2))
            .y(d => y(d.avgPrice));

        svg.append("path")
            .datum(bins)
            .attr("fill", colors[colorIndex])
            .attr("class", "area")
            .attr("d", area);

        svg.append("path")
            .datum(bins)
            .attr("stroke", colors[colorIndex])
            .attr("fill", "none")
            .attr("class", "line")
            .attr("stroke-width", 2)
            .attr("d", line);

        colorIndex++;

        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y));

        const gBrush = svg.append("g")
            .attr("class", "brush")
            .call(brush);

        brushes.push(gBrush);

        const statsDiv = wrapper.append("div")
            .attr("class", "stats");

        const avgText = statsDiv.append("div").text("Average Price (€): -");
        const pctText = statsDiv.append("div").text("Percent Selected: -");

        charts.push({
            data: roomData,
            avgText,
            pctText
        });
    });

    // Syncs the brush across charts
    let isSyncing = false;

    function brushed(event) {
        if (isSyncing) return;

        const selection = event.selection;

        if (!selection) {
            isSyncing = true;

            brushes.forEach(b => b.call(brush.move, null));

            isSyncing = false;

            charts.forEach(chart => {
                chart.avgText.text("Average Price (€): -");
                chart.pctText.text("Percent Selected: -");
            });

            return;
        }

        // ---- This applies brushes to every area ----
        if (event.sourceEvent) {
            isSyncing = true;

            brushes.forEach(b => b.call(brush.move, null));

            brushes.forEach(b => b.call(brush.move, selection));

            isSyncing = false;
        }

        const [x0, x1] = selection.map(x.invert);

        charts.forEach(chart => {
            const selected = chart.data.filter(d =>
                d.distance_city_center >= x0 &&
                d.distance_city_center <= x1
            );

            const avgPrice = d3.mean(selected, d => d.price_total);
            const pct = (selected.length / chart.data.length) * 100;

            chart.avgText.text(
                avgPrice ? `Avg: €${avgPrice.toFixed(2)}` : "Average Price (€): -"
            );

            chart.pctText.text(`Percent Selected: ${pct.toFixed(1)}%`);
        });
    }
});
