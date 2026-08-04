// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://ai-flight-recorder.vercel.app',
	integrations: [
		starlight({
			title: 'AI Flight Recorder',
			description: 'Chrome DevTools for AI Applications',
			logo: {
				src: './src/assets/logo.svg',
				alt: 'AI Flight Recorder',
			},
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/AllThingsSmitty/ai-flight-recorder',
				},
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'index' },
						{ label: 'Installation', slug: 'getting-started/installation' },
					],
				},
				{
					label: 'SDK',
					items: [
						{ label: 'FlightRecorder', slug: 'sdk/overview' },
						{ label: 'Adapters', slug: 'sdk/adapters' },
						{ label: 'Plugins', slug: 'sdk/plugins' },
						{ label: 'Transports', slug: 'sdk/transports' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: '.flight Format', slug: 'reference/flight-format' },
						{ label: 'OpenTelemetry Export', slug: 'reference/opentelemetry' },
					],
				},
				{
					label: 'Tools',
					items: [
						{ label: 'DevTools App', slug: 'tools/devtools' },
						{ label: 'VS Code Extension', slug: 'tools/vscode' },
					],
				},
				{
					label: 'Examples',
					items: [
						{ label: 'Next.js Chat', slug: 'examples/nextjs-chat' },
						{ label: 'Node.js + Anthropic', slug: 'examples/node-anthropic' },
						{ label: 'Node.js + Gemini', slug: 'examples/node-gemini' },
					],
				},
			],
		}),
	],
});
