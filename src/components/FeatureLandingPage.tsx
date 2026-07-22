"use client";

import Link from "next/link";
import React from "react";

interface Benefit {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface FeatureLandingPageProps {
  title: string;
  description: string;
  benefits: Benefit[];
  ctaText: string;
  ctaHref: string;
  illustration: React.ReactNode;
}

export default function FeatureLandingPage({
  title,
  description,
  benefits,
  ctaText,
  ctaHref,
  illustration,
}: FeatureLandingPageProps) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 relative min-h-[calc(100vh-80px)] flex flex-col justify-center">
      {/* Background Glows */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-fuchsia-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-12 right-10 w-[400px] h-[300px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Copy and Benefits */}
        <div className="lg:col-span-7 flex flex-col items-start">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            {title}
          </h1>
          <p className="text-zinc-400 text-lg mb-8 leading-relaxed max-w-xl">
            {description}
          </p>

          {/* Benefits List */}
          <div className="space-y-5 w-full mb-10">
            {benefits.map((benefit, idx) => (
              <div 
                key={idx} 
                className="group flex gap-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md hover:border-zinc-700/50 hover:bg-zinc-900/60 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/10 to-rose-500/10 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform shrink-0 border border-zinc-800/80">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1 tracking-wide uppercase">
                    {benefit.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Action */}
          <Link
            href={ctaHref}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-sm uppercase tracking-widest hover:opacity-95 hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(220,38,38,0.25)] flex items-center gap-2"
          >
            {ctaText}
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        {/* Right Side: Reusable Illustration Frame */}
        <div className="lg:col-span-5 flex justify-center items-center relative">
          <div className="w-full max-w-[400px] aspect-square rounded-3xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-xl p-8 flex items-center justify-center shadow-2xl relative overflow-hidden group">
            {/* Soft inner glow */}
            <div className="absolute -inset-10 bg-gradient-to-br from-red-500/5 to-rose-500/5 opacity-50 blur-2xl group-hover:opacity-100 transition-opacity duration-500" />
            
            {illustration}
          </div>
        </div>

      </div>
    </div>
  );
}
