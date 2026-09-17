This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Real IoT Hardware

Honey Chain accepts telemetry from real ESP32 hive nodes and from the Node.js simulator. The simulator and hardware use the same endpoint:

```text
POST /api/iot/telemetry
```

### Bill of Materials

Approximate per-hive costs in India. Prices vary by supplier and sensor quality.

| Component | Purpose | Approx. cost |
| --- | --- | ---: |
| ESP32 DevKit V1 | Wi-Fi edge controller | INR 450 |
| DHT22 | Temperature and humidity | INR 350 |
| HX711 | Load-cell amplifier | INR 120 |
| 20 kg load cell | Hive weight measurement | INR 450 |
| MAX9814 microphone | Colony acoustic signal | INR 300 |
| MH-Z19B CO2 sensor | Ventilation and CO2 monitoring | INR 1,650 |
| 20 W solar panel + charge controller | Off-grid power | INR 1,400 |
| 18650 battery + holder | Energy storage | INR 500 |
| LoRa fallback radio pair | Long-range fallback when Wi-Fi is unavailable | INR 1,000 |
| Enclosure, wires, connectors | Weather protection and assembly | INR 600 |
| **Estimated total per hive** |  | **INR 6,820** |

### Wiring Pinout

| Device | Pin | ESP32 connection |
| --- | --- | --- |
| DHT22 | VCC | 3V3 |
| DHT22 | DATA | GPIO 4 |
| DHT22 | GND | GND |
| HX711 | VCC | 3V3 |
| HX711 | GND | GND |
| HX711 | DT | GPIO 16 |
| HX711 | SCK | GPIO 17 |
| MAX9814 | VCC | 3V3 |
| MAX9814 | OUT | GPIO 34 (ADC input) |
| MAX9814 | GND | GND |
| MH-Z19B | VIN | 5V boost output |
| MH-Z19B | GND | Common GND |
| MH-Z19B | TX | GPIO 25 (ESP32 RX2) |
| MH-Z19B | RX | GPIO 26 (ESP32 TX2) |
| LoRa module | 3V3, GND | 3V3, GND |
| LoRa module | SCK, MISO, MOSI, NSS | GPIO 18, 19, 23, 5 |
| LoRa module | DIO0 | GPIO 27 |

Load-cell wiring follows the sensor datasheet. The common four-wire convention is Red to E+, Black to E-, Green to A-, and White to A+, but wire colors vary by manufacturer.

The solar panel charges the 18650 through a protected charge controller. Do not connect the panel directly to the ESP32 3V3 rail. The MH-Z19B needs a stable 5 V supply, so use a regulated boost output and share signal ground. Keep analog microphone wiring short and separate from the load-cell amplifier wiring.

### Telemetry Payload

The ESP32 obtains time using NTP, buffers readings during Wi-Fi outages, and posts HTTPS JSON using the server-side device key:

```json
{
	"hiveCode": "HIVE-07",
	"deviceKey": "<IOT_DEVICE_KEY>",
	"readings": [
		{
			"recordedAt": "2026-09-18T10:00:00.000Z",
			"tempC": 35.2,
			"humidity": 62,
			"weightKg": 41.3,
			"soundHz": 250,
			"soundDb": 48,
			"co2Ppm": 900,
			"batteryPct": 87
		}
	]
}
```

For local demonstration, run the 40-node simulator with `npm run iot:simulate`. Real hardware must use the deployed Vercel URL instead of `localhost`.
