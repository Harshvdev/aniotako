"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

// Configure the progress bar to be thin and not show the default spinning circle
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.2 });

export default function NProgressLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // This hook STOPS the progress bar whenever the URL finishes changing
  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  // This hook STARTS the progress bar whenever a user clicks a link (<a> tag)
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.currentTarget as HTMLAnchorElement;
      // Only trigger if it's an internal link
      if (target.href && target.href.startsWith(window.location.origin) && target.target !== "_blank") {
        const currentUrl = window.location.pathname + window.location.search;
        const targetUrl = target.pathname + target.search;
        // Start the bar if we are actually going to a new page
        if (currentUrl !== targetUrl) {
          NProgress.start();
        }
      }
    };

    // Attach the click listener to all links on the page
    const mutationObserver = new MutationObserver(() => {
      const anchors = document.querySelectorAll("a");
      anchors.forEach((a) => a.addEventListener("click", handleAnchorClick));
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => mutationObserver.disconnect();
  }, []);

  return (
    <style jsx global>{`
      /* This styles the progress bar to match your app's Fuchsia/Cyan theme */
      #nprogress .bar {
        background: linear-gradient(to right, #d946ef, #06b6d4) !important;
        height: 3px !important;
      }
      #nprogress .peg {
        box-shadow: 0 0 10px #d946ef, 0 0 5px #06b6d4 !important;
      }
    `}</style>
  );
}