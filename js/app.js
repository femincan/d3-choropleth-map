const tooltipContainer = document.getElementById('tooltip-container');
const tooltipWidth = 260;
const tooltipHeight = 80;
const tooltipDistanceConsonant = 20;
const tooltipDistanceRight = tooltipDistanceConsonant;
const tooltipDistanceLeft = -(tooltipWidth + tooltipDistanceConsonant);
const tooltipDistanceTop = -(tooltipHeight / 2);
const pagePadding = 20;

const setHorizontalDistance = (x) => {
  const { width: clientWidth } = document
    .querySelector('.container')
    .getBoundingClientRect();

  if (x + tooltipDistanceRight + tooltipWidth + pagePadding > clientWidth) {
    return tooltipDistanceLeft;
  }

  return tooltipDistanceRight;
};

const formatTooltipText = (countyName, state, education) =>
  `${countyName}, ${state}<br />${education}%`;

const drawTooltip = (event, county) => {
  const { clientX, clientY } = event;
  const distance = setHorizontalDistance(clientX);

  const tooltip = d3
    .create('div')
    .attr('id', 'tooltip')
    .attr('data-education', county.bachelorsOrHigher)
    .style('top', `${clientY + tooltipDistanceTop}px`)
    .style('left', `${clientX + distance}px`)
    .join('p')
    .html(
      formatTooltipText(
        county.area_name,
        county.state,
        county.bachelorsOrHigher
      )
    );

  tooltipContainer.appendChild(tooltip.node());
};

const updateTooltipLocation = (event) => {
  const { clientX, clientY } = event;
  const distance = setHorizontalDistance(clientX);

  d3.select('#tooltip')
    .style('top', `${clientY + tooltipDistanceTop}px`)
    .style('left', `${clientX + distance}px`);
};

const removeTooltip = () => {
  tooltipContainer.innerHTML = '';
};

const drawChart = async () => {
  const educationData = await d3.json(
    'https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json'
  );

  const usTopology = await d3.json(
    'https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json'
  );

  const countyData = topojson.feature(
    usTopology,
    usTopology.objects.counties
  ).features;

  const stateMesh = topojson.mesh(
    usTopology,
    usTopology.objects.states,
    (a, b) => a !== b
  );

  const findCounty = (id) => educationData.find((county) => county.fips === id);

  const svgContainer = document.getElementById('svg-container');

  const { height: HEIGHT, width: WIDTH } = svgContainer.getBoundingClientRect();

  const svg = d3.create('svg').attr('width', WIDTH).attr('height', HEIGHT);

  const colorScheme = d3.schemeOranges[9];
  const rangeMultiplier = 60;

  const colorScale = d3
    .scaleQuantize()
    .domain(d3.extent(educationData, (data) => data.bachelorsOrHigher))
    .range(colorScheme.map((_, index) => index * rangeMultiplier));

  const values = [
    colorScale.domain()[0],
    ...colorScale.thresholds(),
    colorScale.domain()[1],
  ];
  const legendRectWidth = colorScale.range().at(-1) / (colorScheme.length - 1);

  const legendAxis = d3
    .axisBottom(colorScale)
    .tickValues(values)
    .tickFormat((tick) => `${Math.round(tick)}%`)
    .tickSize([25]);

  const path = d3.geoPath();

  svg
    .append('g')
    .selectAll('path')
    .data(countyData)
    .join('path')
    .attr('d', path)
    .attr('class', 'county')
    .attr('data-fips', (data) => data.id)
    .attr('data-education', (data) => findCounty(data.id).bachelorsOrHigher)
    .style(
      'fill',
      (data) =>
        colorScheme[
          colorScale(findCounty(data.id).bachelorsOrHigher) / rangeMultiplier
        ]
    )
    .on('mouseover', (event, data) => {
      svg
        .append('path')
        .attr('class', 'border county-border')
        .attr('d', path(data));
      drawTooltip(event, findCounty(data.id));
    })
    .on('mousemove', (event) => updateTooltipLocation(event))
    .on('mouseout', () => {
      svg.selectAll('.border.county-border').remove();
      removeTooltip();
    });

  svg.append('path').attr('class', 'border').attr('d', path(stateMesh));

  svg
    .append('g')
    .attr('id', 'legend')
    .attr('transform', 'translate(380, 640)')
    .selectAll('rect')
    .data(colorScheme)
    .join('rect')
    .attr('width', legendRectWidth)
    .attr('height', 15)
    .style('fill', (color) => color)
    .attr(
      'transform',
      (_, index) => `translate(${legendRectWidth * index}, 5)`
    );

  svg.select('#legend').call(legendAxis);

  svg.select('.domain').remove();

  svg
    .selectAll('.tick')
    .attr('transform', (_, index) => `translate(${legendRectWidth * index}, 0)`)
    .selectAll('line')
    .style('stroke-width', 2);

  svgContainer.appendChild(svg.node());
};

drawChart();
