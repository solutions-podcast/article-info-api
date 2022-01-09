'use strict';
const fetch = require('node-fetch');
const metascraper = require('metascraper');

const MBFC_JSON_URL = 'https://raw.githubusercontent.com/drmikecrowe/mbfcext/main/docs/v3/combined.json';

const reportingScale = {
	VH: 'Very High',
	H: 'High',
	MF: 'Mostly Factual',
	M: 'Mixed',
	L: 'Low',
	VL: 'Very Low',
};

const biasScale = {
	L: 'Left Bias',
	LC: 'Left-Center Bias',
	C: 'Least Biased (Center)',
	RC: 'Right-Center Bias',
	R: 'Right Bias',
	PS: 'Pro-Science',
	CP: 'Conspiracy-Pseudoscience',
	S: 'Satire',
	FN: 'Questionable Sources',
};

// Re-used between invocations
let mbfcData;
let meta;

module.exports.hello = async (event) => {
	// const url = event.

	if (!mbfcData) {
		mbfcData = await (await fetch(MBFC_JSON_URL)).json();
	}
	if (!meta) {
		meta = metascraper([
			require('metascraper-author')(),
			require('metascraper-date')(),
			require('metascraper-description')(),
			require('metascraper-image')(),
			require('metascraper-logo')(),
			require('metascraper-publisher')(),
			require('metascraper-title')(),
			require('metascraper-url')(),
		]);
	}

	if (!event.queryStringParameters || !event.queryStringParameters.url) {
		return {
			statusCode: 400,
			body: {
				error: 'URL not specified',
			},
		};
	}

	const { biases } = mbfcData;
	const biasInfo = {
		L: biases['left'],
		LC: biases['left-center'],
		C: biases['center'],
		RC: biases['right-center'],
		R: biases['right'],
		PS: biases['pro-science'],
		CP: biases['conspiracy'],
		S: biases['satire'],
		FN: biases['fake-news'],
	};

	const formatMbfc = (entry) => ({
		siteName: entry.n,
		mbfcUrl: `https://mediabiasfactcheck.com/${entry.u}`,
		factualReporting: reportingScale[entry.r],
		bias: biasScale[entry.b],
		biasDescription: biasInfo[entry.b].description,
		lastUpdated: mbfcData.date,
	});

	const url = event.queryStringParameters.url;
	const siteUrl = url.split('/')[2].replace('www.', '');
	const articleResponse = await fetch(url);
	const html = await articleResponse.text();

	const metadata = await meta({ html, url });
	const mbfc = Object.values(mbfcData.sources).find((entry) => siteUrl === entry.d);

	return {
		statusCode: 200,
		body: JSON.stringify(
			{
				...metadata,
				mbfc: formatMbfc(mbfc, mbfcData.date),
			},
			null,
			2
		),
	};
};
