import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                ink: {
                    DEFAULT: '#1A1A1A',
                    light: '#4A4A4A',
                },
                paper: {
                    DEFAULT: '#F9F7F5',
                    texture: '#F4F2EE', // Slightly darker for bg
                },
                border: {
                    DEFAULT: '#E5E0D8',
                },
                accent: {
                    red: '#D93025',
                    blue: '#1A73E8',
                }
            },
            fontFamily: {
                serif: ['Georgia', 'Times New Roman', 'serif'],
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                paper: '0 4px 20px rgba(0,0,0,0.05)',
                float: '0 10px 30px rgba(0,0,0,0.1)',
            },
            backgroundImage: {
                'paper-texture': "url('https://www.transparenttextures.com/patterns/cream-paper.png')", // Fallback or remove if using color
            },
        },
    },
    plugins: [],
};
export default config;
