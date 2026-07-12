import { loadAndProcessWorldData, loadAndProcessCountryData } from './loadAndProcessData.js'
import { worldMap } from './worldMap.js'
import { stackedAreaChart } from './stackedAreaChart.js'
import { timeline } from './timeline.js';

// Global variables

const worldSVG = d3.select('#worldSVG');
const stackedAreaSVG = d3.select('#stackedAreaSVG');
const sliderContainer = d3.select('.slider-container');
const gasFilterCheckboxes = document.querySelectorAll("input[name='emission-type']");

const worldHeading = d3.select('#world-heading-text');
const defaultWorldHeadingText = "World Emissions in "
const countryHeading = d3.select('#country-heading-text');
const forceCheckbox = document.getElementById('force-checkbox');
const relativeCheckbox = document.getElementById('relative-checkbox');
relativeCheckbox.checked = false;
forceCheckbox.checked = false;

let countries;
let emissionsData;
let emissionsByCode;
let years;
let idToAlpha3;
let colourMap;

let selectedYear = '2000';
let distIntoPast = 5;
worldHeading.text(defaultWorldHeadingText + selectedYear);

let countryName;
let countryData;
let displayType = 'absolute'
let selectedSubstances = new Set(['CO2', 'GWP_100_AR5_CH4', 'GWP_100_AR5_N2O', 'GWP_100_AR5_F-gases']);
let forceEnabled = false;

// Update function
const updateVis = () => {
  worldHeading.text(defaultWorldHeadingText + selectedYear);

  const map = worldMap(worldSVG, {
    countries:countries,
    emissionsByCode:emissionsByCode,
    years:years,
    selectedYear:selectedYear,
    distIntoPast:distIntoPast,
    idToAlpha3:idToAlpha3,
    countryClick:loadCountry,
    forceEnabled:forceEnabled
  });
  stackedAreaChart(stackedAreaSVG, {
    data:countryData,
    name:countryName,
    margin: {top: 30, bottom: 25, left: 40, right: 20},
    displayType: displayType,
    selectedSubstances: selectedSubstances,
    selectedYear:selectedYear,
    pastYear:String(Number(selectedYear) - distIntoPast),
    colourMap:colourMap
  });

  timeline(sliderContainer, {
    selectedStartYear: Number(selectedYear) - distIntoPast,
    selectedEndYear: Number(selectedYear),
    onYearUpdate: (l, r) => {
      selectedYear = String(r);
      distIntoPast = r-l;
      updateVis();
    }
  });

};



const loadCountry = async (code, name) => {
  countryName = name;
  countryHeading.text(name);
  
  // Must call asyncronously
  [countryData, colourMap] = await loadAndProcessCountryData(code);
  
  updateVis();
}

loadAndProcessWorldData().then(([loadedCountries, loadedEmissionsData, loadedEmissionsByCode, loadedYears, loadedIdToAlpha3]) => {
  countries = loadedCountries;
  emissionsData = loadedEmissionsData;
  emissionsByCode = loadedEmissionsByCode;
  years = loadedYears;
  idToAlpha3 = loadedIdToAlpha3;
  updateVis();
});


const menu = document.getElementById('emission-menu');

document.getElementById('emission-toggle').addEventListener('click', () => {
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#emission-dropdown')) {
    menu.style.display = 'none';
  }
});


function onEmissionTypeChange() {
  // Maintain that selectedSubstances should be the correct set
  const checked = [...Array.from(gasFilterCheckboxes).filter(d => d ? d.checked : false)].map(d => d.value);
  selectedSubstances = new Set(checked);
  updateVis();
}

forceCheckbox.addEventListener('change', (e) => {
  const isChecked = e.target.checked;
  if (isChecked) {
    forceEnabled = true;
  } else {
    forceEnabled = false
  }
  updateVis();
});

relativeCheckbox.addEventListener('change', (e) => {
  const isChecked = e.target.checked;
  if (isChecked) {
    displayType = 'relative'
  } else {
    displayType = 'absolute'
  }
  updateVis();
});

// Set initial state of dropdown checkboxes
gasFilterCheckboxes.forEach(d => {
    d.checked = true;
    d.addEventListener('change', onEmissionTypeChange); 
  });


const helpBtn     = document.getElementById('help-btn');
const helpOverlay = document.getElementById('help-overlay');
const helpClose   = document.getElementById('help-close');

helpBtn.addEventListener('click', () => helpOverlay.classList.add('active'));
helpClose.addEventListener('click', () => helpOverlay.classList.remove('active'));
helpOverlay.addEventListener('click', (e) => {
  if (e.target === helpOverlay) helpOverlay.classList.remove('active');
});