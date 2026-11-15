/* Display-only compact units; years deliberately do not use this formatter. */
(()=>{'use strict';
const units=['','K','M','B','T','Q'];
function compact(value,digits=3){
 if(value==null||!Number.isFinite(Number(value)))return 'Not recorded';
 value=Number(value);const a=Math.abs(value);let i=a>=1000?Math.min(5,Math.floor(Math.log10(a)/3)):0;
 let n=value/1000**i;
 if(i<5&&Math.abs(Number(n.toPrecision(digits)))>=1000){i++;n=value/1000**i;}
 return n.toLocaleString('en-US',{notation:'standard',maximumSignificantDigits:digits})+units[i];
}
window.AtlasNumbers={compact};
})();
