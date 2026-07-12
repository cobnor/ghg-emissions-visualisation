export const loadAndProcessWorldData = () =>
  Promise.all([
    d3.json("./data/countries-50m.json"),
    d3.csv("./data/EDGAR_2025_GHG_totals_by_country.csv"),
    d3.csv("./data/ID_TO_CODE.csv")
  ]).then(([topoData, csvData, idToCodeData]) => {
    // Conversion from TopoJSON to GeoJSON
    const countries = topojson.feature(topoData, topoData.objects.countries);
    
    const years = d3.range(1970, 2025).map(String);

    const emissionsData = csvData.map(d => {
      const values = {};

      years.forEach(year => {
        values[year] = d[year] === "" ? null : +d[year];
      });

      return {
        code: d["EDGAR Country Code"],
        country: d["Country"],
        values
      };
    });
    // Map country name to yearly emissions
    const emissionsByCountry = new Map(
      emissionsData.map(d => [d.code, d])
    );
    // Map ID to iso-alpha3 (This lines up with the EDGAR Country Code)
    // Data found at https://stefangabos.github.io/world_countries/
    const idToAlpha3 = new Map(
      idToCodeData.map(d => [Number(d.id), d.alpha3.toUpperCase()])
    );

    return [countries, emissionsData, emissionsByCountry, years, idToAlpha3];
  });



export const loadAndProcessCountryData = (code) => {
  return d3.csv("./data/EDGAR_2025_GHG_by_sector_and_country.csv").then((csvData) => {
    const years = d3.range(1970, 2025).map(String);
    
    const yearlyEmissions = {};
    years.forEach(year => {
      yearlyEmissions[year] = {};
    });

    // Filter data for the requested country code
    const countryData = csvData.filter(d => d["EDGAR Country Code"] === code);

    // Heirarchy is year to substance to sector
    countryData.forEach(row => {
      const substance = row["Substance"];
      const sector = row["Sector"];

      years.forEach(year => {
        // Parse the value, defaulting to 0 if empty
        const value = row[year] === "" ? 0 : +row[year];
        
        // If this is the first time we are seeing this substance for this year, initialize an empty object to hold its sectors
        if (!yearlyEmissions[year][substance]) {
          yearlyEmissions[year][substance] = {};
        }
        
        // Assign the emission value to the specific sector
        yearlyEmissions[year][substance][sector] = value;
      });
    });

    // Build colourmap - this is necessary otherwise mapping can change
    // Also have to sort it since some countries present the sectors in different orders 
    const sectors = [...new Set(countryData.map(row => row["Sector"]))].sort();
    const colourMap = Object.fromEntries(
      sectors.map((sector, i) => [sector, d3.schemeTableau10[i % d3.schemeTableau10.length]])
    );
    return [yearlyEmissions, colourMap];
  });
};