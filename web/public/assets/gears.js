
function gear(cx,cy,r,n){var d="",t=Math.PI*2/n,i,a,p=[[r*.82,0],[r,.18],[r,.5],[r*.82,.68]];
 for(i=0;i<n;i++)p.forEach(function(q,k){a=t*(i+q[1]);d+=(i+k?"L":"M")+(cx+Math.cos(a)*q[0]).toFixed(1)+" "+(cy+Math.sin(a)*q[0]).toFixed(1)});
 return d+"Z M"+(cx+r*.3)+" "+cy+"A"+r*.3+" "+r*.3+" 0 1 0 "+(cx-r*.3)+" "+cy+"A"+r*.3+" "+r*.3+" 0 1 0 "+(cx+r*.3)+" "+cy+"Z"}
document.getElementById("gA").setAttribute("d",gear(110,250,92,14));
document.getElementById("gB").setAttribute("d",gear(310,90,70,11));
document.getElementById("gC").setAttribute("d",gear(330,280,48,8));
document.querySelector(".lg").setAttribute("d",gear(20,20,18,9));

