const width = 500;
const height = 250;
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

    // ---- USED FOR COLORS?
    const colors = ["#1f77b4", "#ff7f0e", "#2ca02c"];

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

        const svg = container.append("div")
            .attr("class", "facet")
            .append("svg")
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

        // ------ COLOR IMPLEMENTATION SHOULD BE HERE ------
        svg.append("path")
            .datum(bins)
            .attr("class", "area")
            .attr("d", area);

        svg.append("path")
            .datum(bins)
            .attr("class", "line")
            .attr("d", line);

        // Axes Start Here.
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y));

        // This is for the brush interaction.
        const brush = d3.brushX()
            .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
            .on("brush end", ({ selection }) => {
                if (!selection) return;

                const [x0, x1] = selection.map(x.invert);

                const selected = data.filter(d =>
                    d.distance_city_center >= x0 &&
                    d.distance_city_center <= x1
                );

                updateStats(selected, data.length);
            });

        svg.append("g")
            .attr("class", "brush")
            .call(brush);
    });

    function updateStats(selected, totalCount) {
        const avgPrice = d3.mean(selected, d => d.price_total);
        const pct = (selected.length / totalCount) * 100;

        d3.select("#avgPrice").text(
            avgPrice ? `$${avgPrice.toFixed(2)}` : "-"
        );

        d3.select("#pctListings").text(
            `${pct.toFixed(1)}%`
        );
    }
});
