import prompt from "prompt-sync";
const promptSync = prompt({ sigint: true });

import "dotenv/config";
import FormData from "form-data";
import fs from "fs";
import CryptoJS from "crypto-js";
import axios from "axios";

const sleep = async (ms) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

const loadApiKeysFromFile = () => {
	let apiKeys = fs.readFileSync("./apikeys.csv", "utf8");
	apiKeys = apiKeys.replaceAll("\r", "");

	let lines = apiKeys.split("\n");

	lines.shift();

	return lines.map((line) => {
		const [apiKey, domain] = line.split(",");

		const credsArray = CryptoJS.enc.Utf8.parse(`api:${apiKey}`);

		return {
			apiKey: CryptoJS.enc.Base64.stringify(credsArray),
			domain,
		};
	});
};

const sendEmail = async (from, to, subject, text) => {
	// find api key for the domain
	const domain = from.split("@")[1];

	const apiKeyObject = apiKeys.find((apiKey) => apiKey.domain === domain);

	if (!apiKeyObject) {
		console.log("No api key found for domain: " + domain);
		return false;
	}

	try {
		let formData = new FormData();

		formData.append("from", from);
		formData.append("to", to);
		formData.append("subject", subject);
		formData.append("text", text);

		const headers = formData.getHeaders();

		headers.Authorization = `Bearer ${apiKeyObject.apiKey}`;

		const response = await axios({
			method: "post",
			url: `https://api.eu.mailgun.net/v3/${domain}/messages`,
			headers: headers,
			data: formData,
		});

		console.log("Email sent status: ", response.statusText);

		return true;
	} catch (err) {
		console.log(err);
	}
};

const sendSingleCustomEmail = async (
	emailText,
	subject,
	fromAddress,
	toAddress
) => await sendEmail(fromAddress, toAddress, subject, emailText);

const sendSingleOrderQueryEmail = async (orderNumber, fromAddress, toAddress) =>
	await sendEmail(
		fromAddress,
		toAddress,
		`Query for Order ${orderNumber}`,
		`Hey,\n\nI was wondering what the status of my order is, order number: ${orderNumber}? It's not arrived nor have i got an update via email? Could you please check it for me?\n\nThanks`
	);

const sendSingleVATQueryEmail = async (orderNumber, fromAddress, toAddress) =>
	await sendEmail(
		fromAddress,
		toAddress,
		`Query for Order ${orderNumber}`,
		`Hello,\n\nI recently purchased ${orderNumber} from your site, however was never issued a VAT invoice.\n\nPlease could you issue me an invoice which shows the VAT breakdown and also your companies VAT number please.\n\nThank you!
		`
	);

const sendSingleReturnQueryEmail = async (
	orderNumber,
	fromAddress,
	toAddress
) =>
	await sendEmail(
		fromAddress,
		toAddress,
		`Return Query for Order ${orderNumber}`,
		`Hey,\n\nI recently received order: ${orderNumber} and would like to return this please.\n Could start a return and send me the relevent documents to this email for this please?\n\nThanks`
	);

const sendSingleVictoriaSecretEmail = async (
	orderDate,
	fromAddress,
	toAddress
) =>
	await sendEmail(
		fromAddress,
		toAddress,
		`Enquiry about my latest order`,
		`Hey,\n\nI recently placed an order on ${orderDate}. Please can you send me a VAT invoice for this purchase?.\n\nJCOPPS LTD\n22 Frenze Hall Lane,\nDiss,\nIP22 4UB\n\nVAT Number - GB414117242?\n\nThanks`
	);

const sendSingleRefundQueryEmail = async (
	orderNumber,
	fromAddress,
	toAddress
) =>
	await sendEmail(
		fromAddress,
		toAddress,
		`Refund Query for Order ${orderNumber}`,
		`Hey,\n\nCould you please share the reference of the refund for order number: ${orderNumber}? I need to chase it up as I don't think i've got it yet.\n\nThanks`
	);

const sendMultipleEmails = async (toAddress, type) => {
	const orderQueryData = await fs.promises.readFile(
		`./${type}query.csv`,
		"utf8"
	);
	const lines = orderQueryData.split("\n");

	lines.shift();

	await lines.reduce(async (promise, emailRequest) => {
		await promise;

		emailRequest = emailRequest.split(",");

		switch (type) {
			case "order":
				await sendSingleOrderQueryEmail(
					emailRequest[1],
					emailRequest[0],
					toAddress
				);
				break;
			case "return":
				await sendSingleReturnQueryEmail(
					emailRequest[1],
					emailRequest[0],
					toAddress
				);
				break;
			case "refund":
				await sendSingleRefundQueryEmail(
					emailRequest[1],
					emailRequest[0],
					toAddress
				);
				break;
			case "vat":
				await sendSingleVATQueryEmail(
					emailRequest[1],
					emailRequest[0],
					toAddress
				);
				break;
			case "victoriasecret":
				await sendSingleVictoriaSecretEmail(
					emailRequest[1],
					emailRequest[0],
					toAddress
				);
				break;
			default:
				break;
		}

		console.log(
			`Sent ${type} query from ${emailRequest[0]}. Waiting 10 seconds.`
		);
		await sleep(10000);
	}, Promise.resolve());

	console.log(`Finished sending emails.`);
};

console.log("Loading api keys...");
const apiKeys = loadApiKeysFromFile();
console.log(apiKeys);

const toAddress = promptSync(
	"(Only have to enter once) Enter the recipient email address: "
);

console.log(`Welcome to the Mailgun Email Sender\n
	MENU
	1. Send Custom Email

	2. Send Order Query Template Email
	3. Send Refund Reference Query Email
	4. Send Return Query Template Email

	5. Send Order Query Template Emails from file
	6. Send Refund Query Emails from file
	7. Send Return Query Template Emails
	8. Send VAT Invoice query emails
	9. Send Victoria Secret VAT Invoice query emails`);

let option = promptSync("Enter Option: ");

const main = async (option) => {
	let fromAddress, orderNumber;
	switch (option) {
		case "1":
			fromAddress = promptSync(
				`Enter the email address you want to send from (Enter the full email, xxx@${apiKeys[0].domain}): `
			);
			const subject = promptSync("Enter the subject: ");
			const customText = promptSync(
				"Enter the text you want to send (use \\n for new line. 'Hey,' and 'Thanks' included automatically): "
			);
			await sendSingleCustomEmail(
				customText,
				subject,
				fromAddress,
				toAddress
			);
			break;

		case "2":
			fromAddress = promptSync(
				"Enter the email address you want to send from: "
			);
			orderNumber = promptSync("Enter the order number: ");
			await sendSingleOrderQueryEmail(
				orderNumber,
				fromAddress,
				toAddress
			);
			break;

		case "3":
			fromAddress = promptSync(
				"Enter the email address you want to send from: "
			);
			orderNumber = promptSync("Enter the order number: ");
			await sendSingleRefundQueryEmail(
				orderNumber,
				fromAddress,
				toAddress
			);
			break;

		case "4":
			fromAddress = promptSync(
				"Enter the email address you want to send from: "
			);
			orderNumber = promptSync("Enter the order number: ");
			await sendSingleReturnQueryEmail(
				orderNumber,
				fromAddress,
				toAddress
			);
			break;

		case "5":
			await sendMultipleEmails(toAddress, "order");
			break;

		case "6":
			await sendMultipleEmails(toAddress, "refund");
			break;

		case "7":
			await sendMultipleEmails(toAddress, "return");
			break;

		case "8":
			await sendMultipleEmails(toAddress, "vat");
			break;

		case "9":
			await sendMultipleEmails(toAddress, "victoriasecret");
			break;


		default:
			console.log("Invalid option");
			break;
	}
};

(async () => {
	while (option > 0 && option <= 9) {
		await main(option);

		option = promptSync("Enter Option: ");
	}
})();
