import{a as ei}from"./chunk-6LLRVMLE.js";import{d as ti}from"./chunk-FJITVT3X.js";import{a as $t}from"./chunk-QLQADFZ5.js";import"./chunk-T5SS7OD2.js";import{a as Ut,b as Ft,d as Wt,e as Lt,f as Ht,g as Xt,n as Le,o as He,p as Zt,q as Jt,w as Yt}from"./chunk-GCDLEEWP.js";import"./chunk-75QCJ722.js";import{l as Qt,m as Gt,n as Kt}from"./chunk-ZVM67GQQ.js";import"./chunk-RRGGMH65.js";import{a as se,b as zt}from"./chunk-S3L7IWZZ.js";import"./chunk-RN3JTF4B.js";import{b as We}from"./chunk-UKNBRRH6.js";import"./chunk-ERG3QHXB.js";import"./chunk-Q2SWGX4W.js";import{a as qt}from"./chunk-6QFUL73V.js";import"./chunk-NLI4NHKU.js";import{a as jt}from"./chunk-3KQGR7YR.js";import{B as oe,a as Vt,b as Ot,f as Ve,g as Oe,j as Be,m as Ue,n as Fe,y as Bt}from"./chunk-UVUM4TWZ.js";import"./chunk-S2EGLYEQ.js";import"./chunk-LKWOOPTM.js";import"./chunk-ZOM2OKB3.js";import"./chunk-Z27XCFWW.js";import{f as Nt}from"./chunk-MH5BCD5P.js";import{g as Rt,i as ne,o as ae}from"./chunk-PIGYEOQW.js";import"./chunk-HNE4YS45.js";import{f as Mt,j as Tt,k as kt}from"./chunk-3NOF2XKB.js";import{b as Pt,c as Dt}from"./chunk-FV475IDC.js";import{D as Pe,F as Ye,H as Et,I as $e,J as De,L as It,M as ie,P as At,h as yt,p as Ct,r as wt,s as _e}from"./chunk-BZCKGPOI.js";import{a as Ee,i as St,j as Re}from"./chunk-BAZECE27.js";import{a as ke,d as Ie,e as Ae}from"./chunk-QGZBTYGQ.js";import"./chunk-GN3JT7IS.js";import"./chunk-BYXBJQAS.js";import"./chunk-FTQNAHPC.js";import"./chunk-HNABFYRR.js";import"./chunk-VQODOO6P.js";import"./chunk-JPULYVUU.js";import{a as Ne}from"./chunk-JV3ZYNOD.js";import{a as Ze,c as q}from"./chunk-AHJJRFXE.js";import"./chunk-F7FFIUOV.js";import{a as Je}from"./chunk-CYMSMVVZ.js";import{$b as s,Aa as A,Ab as Z,Ba as G,Bb as O,Bc as ue,Cc as l,D as ot,Dc as ee,E as de,Ea as K,Eb as ye,Fb as gt,Ga as pt,Ha as xe,Ia as mt,Ic as w,Jc as S,K as st,Ka as j,Kc as M,La as ht,Qc as B,Sb as J,Tb as b,Ub as v,Vb as ft,Xb as Y,Y as Ge,Yb as $,Zb as u,_b as r,_c as Te,a as ve,ac as _,bc as Ce,cc as Ke,cd as vt,dc as bt,e as X,fd as te,ga as rt,hc as F,hd as H,ia as Q,ib as p,j as at,jd as z,ka as D,lc as x,ma as c,md as I,nc as C,nd as N,ob as ut,oc as pe,od as xt,pc as W,q as Qe,qb as ce,qc as me,rc as he,sa as g,sc as k,ta as f,tc as E,ua as lt,ub as _t,vc as we,wc as Se,xa as dt,xc as R,ya as ct,yc as Me,zb as T,zc as L}from"./chunk-WLT34MY4.js";import{f as P}from"./chunk-EQDQRRRY.js";var et=new D("CdkAccordion"),ii=(()=>{class n{_stateChanges=new X;_openCloseAllActions=new X;id=c(_e).getId("cdk-accordion-");multi=!1;openAll(){this.multi&&this._openCloseAllActions.next(!0)}closeAll(){this._openCloseAllActions.next(!1)}ngOnChanges(e){this._stateChanges.next(e)}ngOnDestroy(){this._stateChanges.complete(),this._openCloseAllActions.complete()}static \u0275fac=function(t){return new(t||n)};static \u0275dir=O({type:n,selectors:[["cdk-accordion"],["","cdkAccordion",""]],inputs:{multi:[2,"multi","multi",I]},exportAs:["cdkAccordion"],features:[B([{provide:et,useExisting:n}]),xe]})}return n})(),ni=(()=>{class n{accordion=c(et,{optional:!0,skipSelf:!0});_changeDetectorRef=c(z);_expansionDispatcher=c(We);_openCloseAllSubscription=ve.EMPTY;closed=new A;opened=new A;destroyed=new A;expandedChange=new A;id=c(_e).getId("cdk-accordion-child-");get expanded(){return this._expanded}set expanded(e){if(this._expanded!==e){if(this._expanded=e,this.expandedChange.emit(e),e){this.opened.emit();let t=this.accordion?this.accordion.id:this.id;this._expansionDispatcher.notify(this.id,t)}else this.closed.emit();this._changeDetectorRef.markForCheck()}}_expanded=!1;get disabled(){return this._disabled()}set disabled(e){this._disabled.set(e)}_disabled=K(!1);_removeUniqueSelectionListener=()=>{};constructor(){}ngOnInit(){this._removeUniqueSelectionListener=this._expansionDispatcher.listen((e,t)=>{this.accordion&&!this.accordion.multi&&this.accordion.id===t&&this.id!==e&&(this.expanded=!1)}),this.accordion&&(this._openCloseAllSubscription=this._subscribeToOpenCloseAllActions())}ngOnDestroy(){this.opened.complete(),this.closed.complete(),this.destroyed.emit(),this.destroyed.complete(),this._removeUniqueSelectionListener(),this._openCloseAllSubscription.unsubscribe()}toggle(){this.disabled||(this.expanded=!this.expanded)}close(){this.disabled||(this.expanded=!1)}open(){this.disabled||(this.expanded=!0)}_subscribeToOpenCloseAllActions(){return this.accordion._openCloseAllActions.subscribe(e=>{this.disabled||(this.expanded=e)})}static \u0275fac=function(t){return new(t||n)};static \u0275dir=O({type:n,selectors:[["cdk-accordion-item"],["","cdkAccordionItem",""]],inputs:{expanded:[2,"expanded","expanded",I],disabled:[2,"disabled","disabled",I]},outputs:{closed:"closed",opened:"opened",destroyed:"destroyed",expandedChange:"expandedChange"},exportAs:["cdkAccordionItem"],features:[B([{provide:et,useValue:void 0}])]})}return n})(),ai=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=Z({type:n});static \u0275inj=Q({})}return n})();var vi=["body"],xi=["bodyWrapper"],yi=[[["mat-expansion-panel-header"]],"*",[["mat-action-row"]]],Ci=["mat-expansion-panel-header","*","mat-action-row"];function wi(n,h){}var Si=[[["mat-panel-title"]],[["mat-panel-description"]],"*"],Mi=["mat-panel-title","mat-panel-description","*"];function Ti(n,h){n&1&&(Ce(0,"span",1),lt(),Ce(1,"svg",2),bt(2,"path",3),Ke()())}var tt=new D("MAT_ACCORDION"),oi=new D("MAT_EXPANSION_PANEL"),ki=(()=>{class n{_template=c(ut);_expansionPanel=c(oi,{optional:!0});constructor(){}static \u0275fac=function(t){return new(t||n)};static \u0275dir=O({type:n,selectors:[["ng-template","matExpansionPanelContent",""]]})}return n})(),si=new D("MAT_EXPANSION_PANEL_DEFAULT_OPTIONS"),ge=(()=>{class n extends ni{_viewContainerRef=c(_t);_animationsDisabled=Pe();_document=c(dt);_ngZone=c(G);_elementRef=c(j);_renderer=c(ce);_cleanupTransitionEnd;get hideToggle(){return this._hideToggle||this.accordion&&this.accordion.hideToggle}set hideToggle(e){this._hideToggle=e}_hideToggle=!1;get togglePosition(){return this._togglePosition||this.accordion&&this.accordion.togglePosition}set togglePosition(e){this._togglePosition=e}_togglePosition;afterExpand=new A;afterCollapse=new A;_inputChanges=new X;accordion=c(tt,{optional:!0,skipSelf:!0});_lazyContent;_body;_bodyWrapper;_portal;_headerId=c(_e).getId("mat-expansion-panel-header-");constructor(){super();let e=c(si,{optional:!0});this._expansionDispatcher=c(We),e&&(this.hideToggle=e.hideToggle)}_hasSpacing(){return this.accordion?this.expanded&&this.accordion.displayMode==="default":!1}_getExpandedState(){return this.expanded?"expanded":"collapsed"}toggle(){this.expanded=!this.expanded}close(){this.expanded=!1}open(){this.expanded=!0}ngAfterContentInit(){this._lazyContent&&this._lazyContent._expansionPanel===this&&this.opened.pipe(Ge(null),de(()=>this.expanded&&!this._portal),st(1)).subscribe(()=>{this._portal=new Mt(this._lazyContent._template,this._viewContainerRef)}),this._setupAnimationEvents()}ngOnChanges(e){this._inputChanges.next(e)}ngOnDestroy(){super.ngOnDestroy(),this._cleanupTransitionEnd?.(),this._inputChanges.complete()}_containsFocus(){if(this._body){let e=this._document.activeElement,t=this._body.nativeElement;return e===t||t.contains(e)}return!1}_transitionEndListener=({target:e,propertyName:t})=>{e===this._bodyWrapper?.nativeElement&&t==="grid-template-rows"&&this._ngZone.run(()=>{this.expanded?this.afterExpand.emit():this.afterCollapse.emit()})};_setupAnimationEvents(){this._ngZone.runOutsideAngular(()=>{this._animationsDisabled?(this.opened.subscribe(()=>this._ngZone.run(()=>this.afterExpand.emit())),this.closed.subscribe(()=>this._ngZone.run(()=>this.afterCollapse.emit()))):setTimeout(()=>{let e=this._elementRef.nativeElement;this._cleanupTransitionEnd=this._renderer.listen(e,"transitionend",this._transitionEndListener),e.classList.add("mat-expansion-panel-animations-enabled")},200)})}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=T({type:n,selectors:[["mat-expansion-panel"]],contentQueries:function(t,i,a){if(t&1&&me(a,ki,5),t&2){let d;k(d=E())&&(i._lazyContent=d.first)}},viewQuery:function(t,i){if(t&1&&he(vi,5)(xi,5),t&2){let a;k(a=E())&&(i._body=a.first),k(a=E())&&(i._bodyWrapper=a.first)}},hostAttrs:[1,"mat-expansion-panel"],hostVars:4,hostBindings:function(t,i){t&2&&L("mat-expanded",i.expanded)("mat-expansion-panel-spacing",i._hasSpacing())},inputs:{hideToggle:[2,"hideToggle","hideToggle",I],togglePosition:"togglePosition"},outputs:{afterExpand:"afterExpand",afterCollapse:"afterCollapse"},exportAs:["matExpansionPanel"],features:[B([{provide:tt,useValue:void 0},{provide:oi,useExisting:n}]),ye,xe],ngContentSelectors:Ci,decls:9,vars:4,consts:[["bodyWrapper",""],["body",""],[1,"mat-expansion-panel-content-wrapper"],["role","region",1,"mat-expansion-panel-content",3,"id"],[1,"mat-expansion-panel-body"],[3,"cdkPortalOutlet"]],template:function(t,i){t&1&&(pe(yi),W(0),r(1,"div",2,0)(3,"div",3,1)(5,"div",4),W(6,1),gt(7,wi,0,0,"ng-template",5),s(),W(8,2),s()()),t&2&&(p(),J("inert",i.expanded?null:""),p(2),u("id",i.id),J("aria-labelledby",i._headerId),p(4),u("cdkPortalOutlet",i._portal))},dependencies:[Tt],styles:[`.mat-expansion-panel {
  box-sizing: content-box;
  display: block;
  margin: 0;
  overflow: hidden;
}
.mat-expansion-panel.mat-expansion-panel-animations-enabled {
  transition: margin 225ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-expansion-panel {
  position: relative;
  background: var(--mat-expansion-container-background-color, var(--mat-sys-surface));
  color: var(--mat-expansion-container-text-color, var(--mat-sys-on-surface));
  border-radius: var(--mat-expansion-container-shape, 12px);
}
.mat-expansion-panel:not([class*=mat-elevation-z]) {
  box-shadow: var(--mat-expansion-container-elevation-shadow, 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12));
}
.mat-accordion .mat-expansion-panel:not(.mat-expanded), .mat-accordion .mat-expansion-panel:not(.mat-expansion-panel-spacing) {
  border-radius: 0;
}
.mat-accordion .mat-expansion-panel:first-of-type {
  border-top-right-radius: var(--mat-expansion-container-shape, 12px);
  border-top-left-radius: var(--mat-expansion-container-shape, 12px);
}
.mat-accordion .mat-expansion-panel:last-of-type {
  border-bottom-right-radius: var(--mat-expansion-container-shape, 12px);
  border-bottom-left-radius: var(--mat-expansion-container-shape, 12px);
}
@media (forced-colors: active) {
  .mat-expansion-panel {
    outline: solid 1px;
  }
}

.mat-expansion-panel-content-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  grid-template-columns: 100%;
}
.mat-expansion-panel-animations-enabled .mat-expansion-panel-content-wrapper {
  transition: grid-template-rows 225ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-expansion-panel.mat-expanded > .mat-expansion-panel-content-wrapper {
  grid-template-rows: 1fr;
}
@supports not (grid-template-rows: 0fr) {
  .mat-expansion-panel-content-wrapper {
    height: 0;
  }
  .mat-expansion-panel.mat-expanded > .mat-expansion-panel-content-wrapper {
    height: auto;
  }
}
@media print {
  .mat-expansion-panel-content-wrapper {
    height: 0;
  }
  .mat-expansion-panel.mat-expanded > .mat-expansion-panel-content-wrapper {
    height: auto;
  }
}

.mat-expansion-panel-content {
  display: flex;
  flex-direction: column;
  overflow: visible;
  min-height: 0;
  visibility: hidden;
}
.mat-expansion-panel-animations-enabled .mat-expansion-panel-content {
  transition: visibility 190ms linear;
}
.mat-expansion-panel.mat-expanded > .mat-expansion-panel-content-wrapper > .mat-expansion-panel-content {
  visibility: visible;
}
.mat-expansion-panel-content {
  font-family: var(--mat-expansion-container-text-font, var(--mat-sys-body-large-font));
  font-size: var(--mat-expansion-container-text-size, var(--mat-sys-body-large-size));
  font-weight: var(--mat-expansion-container-text-weight, var(--mat-sys-body-large-weight));
  line-height: var(--mat-expansion-container-text-line-height, var(--mat-sys-body-large-line-height));
  letter-spacing: var(--mat-expansion-container-text-tracking, var(--mat-sys-body-large-tracking));
}

.mat-expansion-panel-body {
  padding: 0 24px 16px;
}

.mat-expansion-panel-spacing {
  margin: 16px 0;
}
.mat-accordion > .mat-expansion-panel-spacing:first-child, .mat-accordion > *:first-child:not(.mat-expansion-panel) .mat-expansion-panel-spacing {
  margin-top: 0;
}
.mat-accordion > .mat-expansion-panel-spacing:last-child, .mat-accordion > *:last-child:not(.mat-expansion-panel) .mat-expansion-panel-spacing {
  margin-bottom: 0;
}

.mat-action-row {
  border-top-style: solid;
  border-top-width: 1px;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  padding: 16px 8px 16px 24px;
  border-top-color: var(--mat-expansion-actions-divider-color, var(--mat-sys-outline));
}
.mat-action-row .mat-button-base,
.mat-action-row .mat-mdc-button-base {
  margin-left: 8px;
}
[dir=rtl] .mat-action-row .mat-button-base,
[dir=rtl] .mat-action-row .mat-mdc-button-base {
  margin-left: 0;
  margin-right: 8px;
}
`],encapsulation:2,changeDetection:0})}return n})();var fe=(()=>{class n{panel=c(ge,{host:!0});_element=c(j);_focusMonitor=c(yt);_changeDetectorRef=c(z);_parentChangeSubscription=ve.EMPTY;constructor(){c(Ee).load(De);let e=this.panel,t=c(si,{optional:!0}),i=c(new vt("tabindex"),{optional:!0}),a=e.accordion?e.accordion._stateChanges.pipe(de(d=>!!(d.hideToggle||d.togglePosition))):at;this.tabIndex=parseInt(i||"")||0,this._parentChangeSubscription=ot(e.opened,e.closed,a,e._inputChanges.pipe(de(d=>!!(d.hideToggle||d.disabled||d.togglePosition)))).subscribe(()=>this._changeDetectorRef.markForCheck()),e.closed.pipe(de(()=>e._containsFocus())).subscribe(()=>this._focusMonitor.focusVia(this._element,"program")),t&&(this.expandedHeight=t.expandedHeight,this.collapsedHeight=t.collapsedHeight)}expandedHeight;collapsedHeight;tabIndex=0;get disabled(){return this.panel.disabled}_toggle(){this.disabled||this.panel.toggle()}_isExpanded(){return this.panel.expanded}_getExpandedState(){return this.panel._getExpandedState()}_getPanelId(){return this.panel.id}_getTogglePosition(){return this.panel.togglePosition}_showToggle(){return!this.panel.hideToggle&&!this.panel.disabled}_getHeaderHeight(){let e=this._isExpanded();return e&&this.expandedHeight?this.expandedHeight:!e&&this.collapsedHeight?this.collapsedHeight:null}_keydown(e){switch(e.keyCode){case 32:case 13:Ct(e)||(e.preventDefault(),this._toggle());break;default:this.panel.accordion&&this.panel.accordion._handleHeaderKeydown(e);return}}focus(e,t){e?this._focusMonitor.focusVia(this._element,e,t):this._element.nativeElement.focus(t)}ngAfterViewInit(){this._focusMonitor.monitor(this._element).subscribe(e=>{e&&this.panel.accordion&&this.panel.accordion._handleHeaderFocus(this)})}ngOnDestroy(){this._parentChangeSubscription.unsubscribe(),this._focusMonitor.stopMonitoring(this._element)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=T({type:n,selectors:[["mat-expansion-panel-header"]],hostAttrs:["role","button",1,"mat-expansion-panel-header","mat-focus-indicator"],hostVars:13,hostBindings:function(t,i){t&1&&x("click",function(){return i._toggle()})("keydown",function(d){return i._keydown(d)}),t&2&&(J("id",i.panel._headerId)("tabindex",i.disabled?-1:i.tabIndex)("aria-controls",i._getPanelId())("aria-expanded",i._isExpanded())("aria-disabled",i.panel.disabled),Me("height",i._getHeaderHeight()),L("mat-expanded",i._isExpanded())("mat-expansion-toggle-indicator-after",i._getTogglePosition()==="after")("mat-expansion-toggle-indicator-before",i._getTogglePosition()==="before"))},inputs:{expandedHeight:"expandedHeight",collapsedHeight:"collapsedHeight",tabIndex:[2,"tabIndex","tabIndex",e=>e==null?0:N(e)]},ngContentSelectors:Mi,decls:5,vars:3,consts:[[1,"mat-content"],[1,"mat-expansion-indicator"],["xmlns","http://www.w3.org/2000/svg","viewBox","0 -960 960 960","aria-hidden","true","focusable","false"],["d","M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"]],template:function(t,i){t&1&&(pe(Si),Ce(0,"span",0),W(1),W(2,1),W(3,2),Ke(),b(4,Ti,3,0,"span",1)),t&2&&(L("mat-content-hide-toggle",!i._showToggle()),p(4),v(i._showToggle()?4:-1))},styles:[`.mat-expansion-panel-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 24px;
  border-radius: inherit;
}
.mat-expansion-panel-animations-enabled .mat-expansion-panel-header {
  transition: height 225ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-expansion-panel-header::before {
  border-radius: inherit;
}
.mat-expansion-panel-header {
  height: var(--mat-expansion-header-collapsed-state-height, 48px);
  font-family: var(--mat-expansion-header-text-font, var(--mat-sys-title-medium-font));
  font-size: var(--mat-expansion-header-text-size, var(--mat-sys-title-medium-size));
  font-weight: var(--mat-expansion-header-text-weight, var(--mat-sys-title-medium-weight));
  line-height: var(--mat-expansion-header-text-line-height, var(--mat-sys-title-medium-line-height));
  letter-spacing: var(--mat-expansion-header-text-tracking, var(--mat-sys-title-medium-tracking));
}
.mat-expansion-panel-header.mat-expanded {
  height: var(--mat-expansion-header-expanded-state-height, 64px);
}
.mat-expansion-panel-header[aria-disabled=true] {
  color: var(--mat-expansion-header-disabled-state-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-expansion-panel-header:not([aria-disabled=true]) {
  cursor: pointer;
}
.mat-expansion-panel:not(.mat-expanded) .mat-expansion-panel-header:not([aria-disabled=true]):hover {
  background: var(--mat-expansion-header-hover-state-layer-color, color-mix(in srgb, var(--mat-sys-on-surface) calc(var(--mat-sys-hover-state-layer-opacity) * 100%), transparent));
}
@media (hover: none) {
  .mat-expansion-panel:not(.mat-expanded) .mat-expansion-panel-header:not([aria-disabled=true]):hover {
    background: var(--mat-expansion-container-background-color, var(--mat-sys-surface));
  }
}
.mat-expansion-panel .mat-expansion-panel-header:not([aria-disabled=true]).cdk-keyboard-focused, .mat-expansion-panel .mat-expansion-panel-header:not([aria-disabled=true]).cdk-program-focused {
  background: var(--mat-expansion-header-focus-state-layer-color, color-mix(in srgb, var(--mat-sys-on-surface) calc(var(--mat-sys-focus-state-layer-opacity) * 100%), transparent));
}
.mat-expansion-panel-header._mat-animation-noopable {
  transition: none;
}
.mat-expansion-panel-header:focus, .mat-expansion-panel-header:hover {
  outline: none;
}
.mat-expansion-panel-header.mat-expanded:focus, .mat-expansion-panel-header.mat-expanded:hover {
  background: inherit;
}
.mat-expansion-panel-header.mat-expansion-toggle-indicator-before {
  flex-direction: row-reverse;
}
.mat-expansion-panel-header.mat-expansion-toggle-indicator-before .mat-expansion-indicator {
  margin: 0 16px 0 0;
}
[dir=rtl] .mat-expansion-panel-header.mat-expansion-toggle-indicator-before .mat-expansion-indicator {
  margin: 0 0 0 16px;
}

.mat-content {
  display: flex;
  flex: 1;
  flex-direction: row;
  overflow: hidden;
}
.mat-content.mat-content-hide-toggle {
  margin-right: 8px;
}
[dir=rtl] .mat-content.mat-content-hide-toggle {
  margin-right: 0;
  margin-left: 8px;
}
.mat-expansion-toggle-indicator-before .mat-content.mat-content-hide-toggle {
  margin-left: 24px;
  margin-right: 0;
}
[dir=rtl] .mat-expansion-toggle-indicator-before .mat-content.mat-content-hide-toggle {
  margin-right: 24px;
  margin-left: 0;
}

.mat-expansion-panel-header-title {
  color: var(--mat-expansion-header-text-color, var(--mat-sys-on-surface));
}

.mat-expansion-panel-header-title,
.mat-expansion-panel-header-description {
  display: flex;
  flex-grow: 1;
  flex-basis: 0;
  margin-right: 16px;
  align-items: center;
}
[dir=rtl] .mat-expansion-panel-header-title,
[dir=rtl] .mat-expansion-panel-header-description {
  margin-right: 0;
  margin-left: 16px;
}
.mat-expansion-panel-header[aria-disabled=true] .mat-expansion-panel-header-title,
.mat-expansion-panel-header[aria-disabled=true] .mat-expansion-panel-header-description {
  color: inherit;
}

.mat-expansion-panel-header-description {
  flex-grow: 2;
  color: var(--mat-expansion-header-description-color, var(--mat-sys-on-surface-variant));
}

.mat-expansion-panel-animations-enabled .mat-expansion-indicator {
  transition: transform 225ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-expansion-panel-header.mat-expanded .mat-expansion-indicator {
  transform: rotate(180deg);
}
.mat-expansion-indicator::after {
  border-style: solid;
  border-width: 0 2px 2px 0;
  content: "";
  padding: 3px;
  transform: rotate(45deg);
  vertical-align: middle;
  color: var(--mat-expansion-header-indicator-color, var(--mat-sys-on-surface-variant));
  display: var(--mat-expansion-legacy-header-indicator-display, none);
}
.mat-expansion-indicator svg {
  width: 24px;
  height: 24px;
  margin: 0 -8px;
  vertical-align: middle;
  fill: var(--mat-expansion-header-indicator-color, var(--mat-sys-on-surface-variant));
  display: var(--mat-expansion-header-indicator-display, inline-block);
}

@media (forced-colors: active) {
  .mat-expansion-panel-content {
    border-top: 1px solid;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
}
`],encapsulation:2,changeDetection:0})}return n})(),ze=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275dir=O({type:n,selectors:[["mat-panel-description"]],hostAttrs:[1,"mat-expansion-panel-header-description"]})}return n})(),Xe=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275dir=O({type:n,selectors:[["mat-panel-title"]],hostAttrs:[1,"mat-expansion-panel-header-title"]})}return n})(),je=(()=>{class n extends ii{_keyManager;_ownHeaders=new ht;_headers;hideToggle=!1;displayMode="default";togglePosition="after";ngAfterContentInit(){this._headers.changes.pipe(Ge(this._headers)).subscribe(e=>{this._ownHeaders.reset(e.filter(t=>t.panel.accordion===this)),this._ownHeaders.notifyOnChanges()}),this._keyManager=new wt(this._ownHeaders).withWrap().withHomeAndEnd()}_handleHeaderKeydown(e){this._keyManager.onKeydown(e)}_handleHeaderFocus(e){this._keyManager.updateActiveItem(e)}ngOnDestroy(){super.ngOnDestroy(),this._keyManager?.destroy(),this._ownHeaders.destroy()}static \u0275fac=(()=>{let e;return function(i){return(e||(e=mt(n)))(i||n)}})();static \u0275dir=O({type:n,selectors:[["mat-accordion"]],contentQueries:function(t,i,a){if(t&1&&me(a,fe,5),t&2){let d;k(d=E())&&(i._headers=d)}},hostAttrs:[1,"mat-accordion"],hostVars:2,hostBindings:function(t,i){t&2&&L("mat-accordion-multi",i.multi)},inputs:{hideToggle:[2,"hideToggle","hideToggle",I],displayMode:"displayMode",togglePosition:"togglePosition"},exportAs:["matAccordion"],features:[B([{provide:tt,useExisting:n}]),ye]})}return n})(),qe=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=Z({type:n});static \u0275inj=Q({imports:[ai,kt,Re]})}return n})();var Ai=["notificationsForm"],Ri=["statePanel"],Pi=["soundPanel"];function Di(n,h){n&1&&(r(0,"mat-panel-description"),l(1," Filter Notifications sidenav items "),s())}function Ni(n,h){n&1&&(r(0,"mat-panel-description"),l(1," Override server defined methods "),s())}var li=(()=>{class n{toast=c(ne);settings=c(ae);_responsive=c(Ie);isPhonePortrait;notificationsForm=te.required("notificationsForm");statePanel=te.required("statePanel");soundPanel=te.required("soundPanel");notificationConfig;notificationDisabledExpandPanel=!1;constructor(){this.isPhonePortrait=q(this._responsive.observe(Ae.HandsetPortrait),{requireSync:!0}),this.notificationConfig=Je(this.settings.getNotificationConfig())}saveAllSettings(){this.settings.setNotificationConfig(Je(this.notificationConfig)),this.notificationsForm().form.markAsPristine(),this.toast.show("Configuration saved",1e3,!0,"message")}togglePanel(e){e.checked&&(this.notificationDisabledExpandPanel=!1,this.statePanel().close(),this.soundPanel().close())}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=T({type:n,selectors:[["settings-notifications"]],viewQuery:function(t,i){t&1&&we(i.notificationsForm,Ai,5)(i.statePanel,Ri,5)(i.soundPanel,Pi,5),t&2&&Se(3)},decls:64,vars:17,consts:[["notificationsForm","ngForm"],["statePanel",""],["soundPanel",""],["id","notificationSetting",3,"ngSubmit"],["name","disableNotifications",3,"ngModelChange","ngModel"],["name","disableNotifications",3,"ngModelChange","change","ngModel"],[1,"notification-accordion"],[3,"disabled"],["name","showNormalState",3,"ngModelChange","ngModel"],["name","showNominalState",3,"ngModelChange","ngModel"],["name","muteAlert",3,"ngModelChange","ngModel","disabled"],["name","muteWarn",3,"ngModelChange","ngModel","disabled"],["name","muteAlarm",3,"ngModelChange","ngModel","disabled"],["name","muteEmergency",3,"ngModelChange","ngModel","disabled"],[1,"formActionFooter"],[1,"formActionDivider"],["mat-flat-button","","type","submit",1,"formActionButton",3,"disabled"]],template:function(t,i){if(t&1){let a=F();r(0,"form",3,0),x("ngSubmit",function(){return i.saveAllSettings()}),r(2,"p"),l(3,"Configure audio and visual notification settings and stay informed of critical events."),s(),r(4,"mat-slide-toggle",4),M("ngModelChange",function(o){return g(a),S(i.notificationConfig.sound.disableSound,o)||(i.notificationConfig.sound.disableSound=o),f(o)}),l(5," Disable audio "),s(),_(6,"br")(7,"br"),r(8,"mat-slide-toggle",5),M("ngModelChange",function(o){return g(a),S(i.notificationConfig.disableNotifications,o)||(i.notificationConfig.disableNotifications=o),f(o)}),x("change",function(o){return i.togglePanel(o)}),l(9," Disable Notifications "),s(),_(10,"br")(11,"br"),r(12,"div",6)(13,"mat-accordion")(14,"mat-expansion-panel",7,1)(16,"mat-expansion-panel-header")(17,"mat-panel-title"),l(18," States "),s(),b(19,Di,2,0,"mat-panel-description"),s(),r(20,"mat-checkbox",8),M("ngModelChange",function(o){return g(a),S(i.notificationConfig.devices.showNormalState,o)||(i.notificationConfig.devices.showNormalState=o),f(o)}),l(21," Show "),r(22,"b"),l(23,"Normal"),s(),l(24," state "),s(),_(25,"br"),r(26,"mat-checkbox",9),M("ngModelChange",function(o){return g(a),S(i.notificationConfig.devices.showNominalState,o)||(i.notificationConfig.devices.showNominalState=o),f(o)}),l(27," Show "),r(28,"b"),l(29,"Nominal"),s(),l(30," state "),s()(),r(31,"mat-expansion-panel",7,2)(33,"mat-expansion-panel-header")(34,"mat-panel-title"),l(35," Audio "),s(),b(36,Ni,2,0,"mat-panel-description"),s(),r(37,"mat-checkbox",10),M("ngModelChange",function(o){return g(a),S(i.notificationConfig.sound.muteAlert,o)||(i.notificationConfig.sound.muteAlert=o),f(o)}),l(38," Mute "),r(39,"b"),l(40,"all Alert"),s(),l(41," state "),s(),_(42,"br"),r(43,"mat-checkbox",11),M("ngModelChange",function(o){return g(a),S(i.notificationConfig.sound.muteWarn,o)||(i.notificationConfig.sound.muteWarn=o),f(o)}),l(44," Mute "),r(45,"b"),l(46,"all Warn"),s(),l(47," state "),s(),_(48,"br"),r(49,"mat-checkbox",12),M("ngModelChange",function(o){return g(a),S(i.notificationConfig.sound.muteAlarm,o)||(i.notificationConfig.sound.muteAlarm=o),f(o)}),l(50," Mute "),r(51,"b"),l(52,"all Alarm"),s(),l(53," state "),s(),_(54,"br"),r(55,"mat-checkbox",13),M("ngModelChange",function(o){return g(a),S(i.notificationConfig.sound.muteEmergency,o)||(i.notificationConfig.sound.muteEmergency=o),f(o)}),l(56," Mute "),r(57,"b"),l(58,"all Emergency"),s(),l(59," state "),s()()()(),r(60,"div",14),_(61,"mat-divider",15),r(62,"button",16),l(63,"Save"),s()()()}if(t&2){let a=R(1);p(4),w("ngModel",i.notificationConfig.sound.disableSound),p(4),w("ngModel",i.notificationConfig.disableNotifications),p(6),u("disabled",i.notificationConfig.disableNotifications),p(5),v(i.isPhonePortrait().matches?-1:19),p(),w("ngModel",i.notificationConfig.devices.showNormalState),p(6),w("ngModel",i.notificationConfig.devices.showNominalState),p(5),u("disabled",i.notificationConfig.disableNotifications),p(5),v(i.isPhonePortrait().matches?-1:36),p(),w("ngModel",i.notificationConfig.sound.muteAlert),u("disabled",i.notificationConfig.sound.disableSound),p(6),w("ngModel",i.notificationConfig.sound.muteWarn),u("disabled",i.notificationConfig.sound.disableSound),p(6),w("ngModel",i.notificationConfig.sound.muteAlarm),u("disabled",i.notificationConfig.sound.disableSound),p(6),w("ngModel",i.notificationConfig.sound.muteEmergency),u("disabled",i.notificationConfig.sound.disableSound),p(7),u("disabled",!a.form.dirty)}},dependencies:[oe,Fe,Ve,Oe,Ue,Be,Xt,He,Le,qe,je,ge,fe,Xe,ze,se,ie],styles:[".notification-accordion[_ngcontent-%COMP%]{margin-left:25px}"]})}return n})();var Vi=["knob"],Oi=["valueIndicatorContainer"];function Bi(n,h){if(n&1&&(r(0,"div",2,1)(2,"div",5)(3,"span",6),l(4),s()()()),n&2){let e=C();p(4),ee(e.valueIndicatorText)}}var Ui=["trackActive"],Fi=["*"];function Wi(n,h){if(n&1&&_(0,"div"),n&2){let e=h.$implicit,t=h.$index,i=C(3);ue(e===0?"mdc-slider__tick-mark--active":"mdc-slider__tick-mark--inactive"),Me("transform",i._calcTickMarkTransform(t))}}function Li(n,h){if(n&1&&Y(0,Wi,1,4,"div",8,ft),n&2){let e=C(2);$(e._tickMarks)}}function Hi(n,h){if(n&1&&(r(0,"div",6,1),b(2,Li,2,0),s()),n&2){let e=C();p(2),v(e._cachedWidth?2:-1)}}function zi(n,h){if(n&1&&_(0,"mat-slider-visual-thumb",7),n&2){let e=C();u("discrete",e.discrete)("thumbPosition",1)("valueIndicatorText",e.startValueIndicatorText)}}var m=(function(n){return n[n.START=1]="START",n[n.END=2]="END",n})(m||{}),le=(function(n){return n[n.ACTIVE=0]="ACTIVE",n[n.INACTIVE=1]="INACTIVE",n})(le||{}),it=new D("_MatSlider"),di=new D("_MatSliderThumb"),Xi=new D("_MatSliderRangeThumb"),ci=new D("_MatSliderVisualThumb");var ji=(()=>{class n{_cdr=c(z);_ngZone=c(G);_slider=c(it);_renderer=c(ce);_listenerCleanups;discrete=!1;thumbPosition;valueIndicatorText;_ripple;_knob;_valueIndicatorContainer;_sliderInput;_sliderInputEl;_hoverRippleRef;_focusRippleRef;_activeRippleRef;_isHovered=!1;_isActive=!1;_isValueIndicatorVisible=!1;_hostElement=c(j).nativeElement;_platform=c(ke);constructor(){}ngAfterViewInit(){let e=this._slider._getInput(this.thumbPosition);e&&(this._ripple.radius=24,this._sliderInput=e,this._sliderInputEl=this._sliderInput._hostElement,this._ngZone.runOutsideAngular(()=>{let t=this._sliderInputEl,i=this._renderer;this._listenerCleanups=[i.listen(t,"pointermove",this._onPointerMove),i.listen(t,"pointerdown",this._onDragStart),i.listen(t,"pointerup",this._onDragEnd),i.listen(t,"pointerleave",this._onMouseLeave),i.listen(t,"focus",this._onFocus),i.listen(t,"blur",this._onBlur)]}))}ngOnDestroy(){this._listenerCleanups?.forEach(e=>e())}_onPointerMove=e=>{if(this._sliderInput._isFocused)return;let t=this._hostElement.getBoundingClientRect(),i=this._slider._isCursorOnSliderThumb(e,t);this._isHovered=i,i?this._showHoverRipple():this._hideRipple(this._hoverRippleRef)};_onMouseLeave=()=>{this._isHovered=!1,this._hideRipple(this._hoverRippleRef)};_onFocus=()=>{this._hideRipple(this._hoverRippleRef),this._showFocusRipple(),this._hostElement.classList.add("mdc-slider__thumb--focused")};_onBlur=()=>{this._isActive||this._hideRipple(this._focusRippleRef),this._isHovered&&this._showHoverRipple(),this._hostElement.classList.remove("mdc-slider__thumb--focused")};_onDragStart=e=>{e.button===0&&(this._isActive=!0,this._showActiveRipple())};_onDragEnd=()=>{this._isActive=!1,this._hideRipple(this._activeRippleRef),this._sliderInput._isFocused||this._hideRipple(this._focusRippleRef),this._platform.SAFARI&&this._showHoverRipple()};_showHoverRipple(){this._isShowingRipple(this._hoverRippleRef)||(this._hoverRippleRef=this._showRipple({enterDuration:0,exitDuration:0}),this._hoverRippleRef?.element.classList.add("mat-mdc-slider-hover-ripple"))}_showFocusRipple(){this._isShowingRipple(this._focusRippleRef)||(this._focusRippleRef=this._showRipple({enterDuration:0,exitDuration:0},!0),this._focusRippleRef?.element.classList.add("mat-mdc-slider-focus-ripple"))}_showActiveRipple(){this._isShowingRipple(this._activeRippleRef)||(this._activeRippleRef=this._showRipple({enterDuration:225,exitDuration:400}),this._activeRippleRef?.element.classList.add("mat-mdc-slider-active-ripple"))}_isShowingRipple(e){return e?.state===Ye.FADING_IN||e?.state===Ye.VISIBLE}_showRipple(e,t){if(!this._slider.disabled&&(this._showValueIndicator(),this._slider._isRange&&this._slider._getThumb(this.thumbPosition===m.START?m.END:m.START)._showValueIndicator(),!(this._slider._globalRippleOptions?.disabled&&!t)))return this._ripple.launch({animation:this._slider._noopAnimations?{enterDuration:0,exitDuration:0}:e,centered:!0,persistent:!0})}_hideRipple(e){if(e?.fadeOut(),this._isShowingAnyRipple())return;this._slider._isRange||this._hideValueIndicator();let t=this._getSibling();t._isShowingAnyRipple()||(this._hideValueIndicator(),t._hideValueIndicator())}_showValueIndicator(){this._hostElement.classList.add("mdc-slider__thumb--with-indicator")}_hideValueIndicator(){this._hostElement.classList.remove("mdc-slider__thumb--with-indicator")}_getSibling(){return this._slider._getThumb(this.thumbPosition===m.START?m.END:m.START)}_getValueIndicatorContainer(){return this._valueIndicatorContainer?.nativeElement}_getKnob(){return this._knob.nativeElement}_isShowingAnyRipple(){return this._isShowingRipple(this._hoverRippleRef)||this._isShowingRipple(this._focusRippleRef)||this._isShowingRipple(this._activeRippleRef)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=T({type:n,selectors:[["mat-slider-visual-thumb"]],viewQuery:function(t,i){if(t&1&&he($e,5)(Vi,5)(Oi,5),t&2){let a;k(a=E())&&(i._ripple=a.first),k(a=E())&&(i._knob=a.first),k(a=E())&&(i._valueIndicatorContainer=a.first)}},hostAttrs:[1,"mdc-slider__thumb","mat-mdc-slider-visual-thumb"],inputs:{discrete:"discrete",thumbPosition:"thumbPosition",valueIndicatorText:"valueIndicatorText"},features:[B([{provide:ci,useExisting:n}])],decls:4,vars:2,consts:[["knob",""],["valueIndicatorContainer",""],[1,"mdc-slider__value-indicator-container"],[1,"mdc-slider__thumb-knob"],["matRipple","",1,"mat-focus-indicator",3,"matRippleDisabled"],[1,"mdc-slider__value-indicator"],[1,"mdc-slider__value-indicator-text"]],template:function(t,i){t&1&&(b(0,Bi,5,1,"div",2),_(1,"div",3,0)(3,"div",4)),t&2&&(v(i.discrete?0:-1),p(3),u("matRippleDisabled",!0))},dependencies:[$e],styles:[`.mat-mdc-slider-visual-thumb .mat-ripple {
  height: 100%;
  width: 100%;
}

.mat-mdc-slider .mdc-slider__tick-marks {
  justify-content: start;
}
.mat-mdc-slider .mdc-slider__tick-marks .mdc-slider__tick-mark--active,
.mat-mdc-slider .mdc-slider__tick-marks .mdc-slider__tick-mark--inactive {
  position: absolute;
  left: 2px;
}
`],encapsulation:2,changeDetection:0})}return n})(),pi=(()=>{class n{_ngZone=c(G);_cdr=c(z);_elementRef=c(j);_dir=c(St,{optional:!0});_globalRippleOptions=c(Et,{optional:!0});_trackActive;_thumbs;_input;_inputs;get disabled(){return this._disabled}set disabled(e){this._disabled=e;let t=this._getInput(m.END),i=this._getInput(m.START);t&&(t.disabled=this._disabled),i&&(i.disabled=this._disabled)}_disabled=!1;get discrete(){return this._discrete}set discrete(e){this._discrete=e,this._updateValueIndicatorUIs()}_discrete=!1;get showTickMarks(){return this._showTickMarks}set showTickMarks(e){this._showTickMarks=e,this._hasViewInitialized&&(this._updateTickMarkUI(),this._updateTickMarkTrackUI())}_showTickMarks=!1;get min(){return this._min}set min(e){let t=e==null||isNaN(e)?this._min:e;this._min!==t&&this._updateMin(t)}_min=0;color;disableRipple=!1;_updateMin(e){let t=this._min;this._min=e,this._isRange?this._updateMinRange({old:t,new:e}):this._updateMinNonRange(e),this._onMinMaxOrStepChange()}_updateMinRange(e){let t=this._getInput(m.END),i=this._getInput(m.START),a=t.value,d=i.value;i.min=e.new,t.min=Math.max(e.new,i.value),i.max=Math.min(t.max,t.value),i._updateWidthInactive(),t._updateWidthInactive(),e.new<e.old?this._onTranslateXChangeBySideEffect(t,i):this._onTranslateXChangeBySideEffect(i,t),a!==t.value&&this._onValueChange(t),d!==i.value&&this._onValueChange(i)}_updateMinNonRange(e){let t=this._getInput(m.END);if(t){let i=t.value;t.min=e,t._updateThumbUIByValue(),this._updateTrackUI(t),i!==t.value&&this._onValueChange(t)}}get max(){return this._max}set max(e){let t=e==null||isNaN(e)?this._max:e;this._max!==t&&this._updateMax(t)}_max=100;_updateMax(e){let t=this._max;this._max=e,this._isRange?this._updateMaxRange({old:t,new:e}):this._updateMaxNonRange(e),this._onMinMaxOrStepChange()}_updateMaxRange(e){let t=this._getInput(m.END),i=this._getInput(m.START),a=t.value,d=i.value;t.max=e.new,i.max=Math.min(e.new,t.value),t.min=i.value,t._updateWidthInactive(),i._updateWidthInactive(),e.new>e.old?this._onTranslateXChangeBySideEffect(i,t):this._onTranslateXChangeBySideEffect(t,i),a!==t.value&&this._onValueChange(t),d!==i.value&&this._onValueChange(i)}_updateMaxNonRange(e){let t=this._getInput(m.END);if(t){let i=t.value;t.max=e,t._updateThumbUIByValue(),this._updateTrackUI(t),i!==t.value&&this._onValueChange(t)}}get step(){return this._step}set step(e){let t=isNaN(e)?this._step:e;this._step!==t&&this._updateStep(t)}_step=1;_updateStep(e){this._step=e,this._isRange?this._updateStepRange():this._updateStepNonRange(),this._onMinMaxOrStepChange()}_updateStepRange(){let e=this._getInput(m.END),t=this._getInput(m.START),i=e.value,a=t.value,d=t.value;e.min=this._min,t.max=this._max,e.step=this._step,t.step=this._step,this._platform.SAFARI&&(e.value=e.value,t.value=t.value),e.min=Math.max(this._min,t.value),t.max=Math.min(this._max,e.value),t._updateWidthInactive(),e._updateWidthInactive(),e.value<d?this._onTranslateXChangeBySideEffect(t,e):this._onTranslateXChangeBySideEffect(e,t),i!==e.value&&this._onValueChange(e),a!==t.value&&this._onValueChange(t)}_updateStepNonRange(){let e=this._getInput(m.END);if(e){let t=e.value;e.step=this._step,this._platform.SAFARI&&(e.value=e.value),e._updateThumbUIByValue(),t!==e.value&&this._onValueChange(e)}}displayWith=e=>`${e}`;_tickMarks;_noopAnimations=Pe();_resizeObserver=null;_cachedWidth;_cachedLeft;_rippleRadius=24;startValueIndicatorText="";endValueIndicatorText="";_endThumbTransform;_startThumbTransform;_isRange=!1;_isRtl=Te(()=>this._dir?.valueSignal()==="rtl");_hasViewInitialized=!1;_tickMarkTrackWidth=0;_hasAnimation=!1;_resizeTimer=null;_platform=c(ke);constructor(){c(Ee).load(De);let e=this._isRtl();xt(()=>{let t=this._isRtl();t!==e&&(e=t,this._isRange?this._onDirChangeRange():this._onDirChangeNonRange(),this._updateTickMarkUI())})}_knobRadius=8;_inputPadding;ngAfterViewInit(){this._platform.isBrowser&&this._updateDimensions();let e=this._getInput(m.END),t=this._getInput(m.START);this._isRange=!!e&&!!t,this._cdr.detectChanges();let i=this._getThumb(m.END);this._rippleRadius=i._ripple.radius,this._inputPadding=this._rippleRadius-this._knobRadius,this._isRange?this._initUIRange(e,t):this._initUINonRange(e),this._updateTrackUI(e),this._updateTickMarkUI(),this._updateTickMarkTrackUI(),this._observeHostResize(),this._cdr.detectChanges()}_initUINonRange(e){e.initProps(),e.initUI(),this._updateValueIndicatorUI(e),this._hasViewInitialized=!0,e._updateThumbUIByValue()}_initUIRange(e,t){e.initProps(),e.initUI(),t.initProps(),t.initUI(),e._updateMinMax(),t._updateMinMax(),e._updateStaticStyles(),t._updateStaticStyles(),this._updateValueIndicatorUIs(),this._hasViewInitialized=!0,e._updateThumbUIByValue(),t._updateThumbUIByValue()}ngOnDestroy(){this._resizeObserver?.disconnect(),this._resizeObserver=null}_onDirChangeRange(){let e=this._getInput(m.END),t=this._getInput(m.START);e._setIsLeftThumb(),t._setIsLeftThumb(),e.translateX=e._calcTranslateXByValue(),t.translateX=t._calcTranslateXByValue(),e._updateStaticStyles(),t._updateStaticStyles(),e._updateWidthInactive(),t._updateWidthInactive(),e._updateThumbUIByValue(),t._updateThumbUIByValue()}_onDirChangeNonRange(){this._getInput(m.END)._updateThumbUIByValue()}_observeHostResize(){typeof ResizeObserver>"u"||!ResizeObserver||this._ngZone.runOutsideAngular(()=>{this._resizeObserver=new ResizeObserver(()=>{this._isActive()||(this._resizeTimer&&clearTimeout(this._resizeTimer),this._onResize())}),this._resizeObserver.observe(this._elementRef.nativeElement)})}_isActive(){return this._getThumb(m.START)._isActive||this._getThumb(m.END)._isActive}_getValue(e=m.END){let t=this._getInput(e);return t?t.value:this.min}_skipUpdate(){return!!(this._getInput(m.START)?._skipUIUpdate||this._getInput(m.END)?._skipUIUpdate)}_updateDimensions(){this._cachedWidth=this._elementRef.nativeElement.offsetWidth,this._cachedLeft=this._elementRef.nativeElement.getBoundingClientRect().left}_setTrackActiveStyles(e){let t=this._trackActive.nativeElement.style;t.left=e.left,t.right=e.right,t.transformOrigin=e.transformOrigin,t.transform=e.transform}_calcTickMarkTransform(e){let t=e*(this._tickMarkTrackWidth/(this._tickMarks.length-1));return`translateX(${this._isRtl()?this._cachedWidth-6-t:t}px)`}_onTranslateXChange(e){this._hasViewInitialized&&(this._updateThumbUI(e),this._updateTrackUI(e),this._updateOverlappingThumbUI(e))}_onTranslateXChangeBySideEffect(e,t){this._hasViewInitialized&&(e._updateThumbUIByValue(),t._updateThumbUIByValue())}_onValueChange(e){this._hasViewInitialized&&(this._updateValueIndicatorUI(e),this._updateTickMarkUI(),this._cdr.detectChanges())}_onMinMaxOrStepChange(){this._hasViewInitialized&&(this._updateTickMarkUI(),this._updateTickMarkTrackUI(),this._cdr.markForCheck())}_onResize(){if(this._hasViewInitialized){if(this._updateDimensions(),this._isRange){let e=this._getInput(m.END),t=this._getInput(m.START);e._updateThumbUIByValue(),t._updateThumbUIByValue(),e._updateStaticStyles(),t._updateStaticStyles(),e._updateMinMax(),t._updateMinMax(),e._updateWidthInactive(),t._updateWidthInactive()}else{let e=this._getInput(m.END);e&&e._updateThumbUIByValue()}this._updateTickMarkUI(),this._updateTickMarkTrackUI(),this._cdr.detectChanges()}}_thumbsOverlap=!1;_areThumbsOverlapping(){let e=this._getInput(m.START),t=this._getInput(m.END);return!e||!t?!1:t.translateX-e.translateX<20}_updateOverlappingThumbClassNames(e){let t=e.getSibling(),i=this._getThumb(e.thumbPosition);this._getThumb(t.thumbPosition)._hostElement.classList.remove("mdc-slider__thumb--top"),i._hostElement.classList.toggle("mdc-slider__thumb--top",this._thumbsOverlap)}_updateOverlappingThumbUI(e){!this._isRange||this._skipUpdate()||this._thumbsOverlap!==this._areThumbsOverlapping()&&(this._thumbsOverlap=!this._thumbsOverlap,this._updateOverlappingThumbClassNames(e))}_updateThumbUI(e){if(this._skipUpdate())return;let t=this._getThumb(e.thumbPosition===m.END?m.END:m.START);t._hostElement.style.transform=`translateX(${e.translateX}px)`}_updateValueIndicatorUI(e){if(this._skipUpdate())return;let t=this.displayWith(e.value);if(this._hasViewInitialized?e._valuetext.set(t):e._hostElement.setAttribute("aria-valuetext",t),this.discrete){e.thumbPosition===m.START?this.startValueIndicatorText=t:this.endValueIndicatorText=t;let i=this._getThumb(e.thumbPosition);t.length<3?i._hostElement.classList.add("mdc-slider__thumb--short-value"):i._hostElement.classList.remove("mdc-slider__thumb--short-value")}}_updateValueIndicatorUIs(){let e=this._getInput(m.END),t=this._getInput(m.START);e&&this._updateValueIndicatorUI(e),t&&this._updateValueIndicatorUI(t)}_updateTickMarkTrackUI(){if(!this.showTickMarks||this._skipUpdate())return;let e=this._step&&this._step>0?this._step:1,i=(Math.floor(this.max/e)*e-this.min)/(this.max-this.min);this._tickMarkTrackWidth=(this._cachedWidth-6)*i}_updateTrackUI(e){this._skipUpdate()||(this._isRange?this._updateTrackUIRange(e):this._updateTrackUINonRange(e))}_updateTrackUIRange(e){let t=e.getSibling();if(!t||!this._cachedWidth)return;let i=Math.abs(t.translateX-e.translateX)/this._cachedWidth;e._isLeftThumb&&this._cachedWidth?this._setTrackActiveStyles({left:"auto",right:`${this._cachedWidth-t.translateX}px`,transformOrigin:"right",transform:`scaleX(${i})`}):this._setTrackActiveStyles({left:`${t.translateX}px`,right:"auto",transformOrigin:"left",transform:`scaleX(${i})`})}_updateTrackUINonRange(e){this._isRtl()?this._setTrackActiveStyles({left:"auto",right:"0px",transformOrigin:"right",transform:`scaleX(${1-e.fillPercentage})`}):this._setTrackActiveStyles({left:"0px",right:"auto",transformOrigin:"left",transform:`scaleX(${e.fillPercentage})`})}_updateTickMarkUI(){if(!this.showTickMarks||this.step===void 0||this.min===void 0||this.max===void 0)return;let e=this.step>0?this.step:1;this._isRange?this._updateTickMarkUIRange(e):this._updateTickMarkUINonRange(e)}_updateTickMarkUINonRange(e){let t=this._getValue(),i=Math.max(Math.round((t-this.min)/e),0)+1,a=Math.max(Math.round((this.max-t)/e),0)-1;this._isRtl()?i++:a++,this._tickMarks=Array(i).fill(le.ACTIVE).concat(Array(a).fill(le.INACTIVE))}_updateTickMarkUIRange(e){let t=this._getValue(),i=this._getValue(m.START),a=Math.max(Math.round((i-this.min)/e),0),d=Math.max(Math.round((t-i)/e)+1,0),o=Math.max(Math.round((this.max-t)/e),0);this._tickMarks=Array(a).fill(le.INACTIVE).concat(Array(d).fill(le.ACTIVE),Array(o).fill(le.INACTIVE))}_getInput(e){if(e===m.END&&this._input)return this._input;if(this._inputs?.length)return e===m.START?this._inputs.first:this._inputs.last}_getThumb(e){return e===m.END?this._thumbs?.last:this._thumbs?.first}_setTransition(e){this._hasAnimation=!this._platform.IOS&&e&&!this._noopAnimations,this._elementRef.nativeElement.classList.toggle("mat-mdc-slider-with-animation",this._hasAnimation)}_isCursorOnSliderThumb(e,t){let i=t.width/2,a=t.x+i,d=t.y+i,o=e.clientX-a,y=e.clientY-d;return Math.pow(o,2)+Math.pow(y,2)<Math.pow(i,2)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=T({type:n,selectors:[["mat-slider"]],contentQueries:function(t,i,a){if(t&1&&me(a,di,5)(a,Xi,4),t&2){let d;k(d=E())&&(i._input=d.first),k(d=E())&&(i._inputs=d)}},viewQuery:function(t,i){if(t&1&&he(Ui,5)(ci,5),t&2){let a;k(a=E())&&(i._trackActive=a.first),k(a=E())&&(i._thumbs=a)}},hostAttrs:[1,"mat-mdc-slider","mdc-slider"],hostVars:12,hostBindings:function(t,i){t&2&&(ue("mat-"+(i.color||"primary")),L("mdc-slider--range",i._isRange)("mdc-slider--disabled",i.disabled)("mdc-slider--discrete",i.discrete)("mdc-slider--tick-marks",i.showTickMarks)("_mat-animation-noopable",i._noopAnimations))},inputs:{disabled:[2,"disabled","disabled",I],discrete:[2,"discrete","discrete",I],showTickMarks:[2,"showTickMarks","showTickMarks",I],min:[2,"min","min",N],color:"color",disableRipple:[2,"disableRipple","disableRipple",I],max:[2,"max","max",N],step:[2,"step","step",N],displayWith:"displayWith"},exportAs:["matSlider"],features:[B([{provide:it,useExisting:n}])],ngContentSelectors:Fi,decls:9,vars:5,consts:[["trackActive",""],["tickMarkContainer",""],[1,"mdc-slider__track"],[1,"mdc-slider__track--inactive"],[1,"mdc-slider__track--active"],[1,"mdc-slider__track--active_fill"],[1,"mdc-slider__tick-marks"],[3,"discrete","thumbPosition","valueIndicatorText"],[3,"class","transform"]],template:function(t,i){t&1&&(pe(),W(0),r(1,"div",2),_(2,"div",3),r(3,"div",4),_(4,"div",5,0),s(),b(6,Hi,3,1,"div",6),s(),b(7,zi,1,3,"mat-slider-visual-thumb",7),_(8,"mat-slider-visual-thumb",7)),t&2&&(p(6),v(i.showTickMarks?6:-1),p(),v(i._isRange?7:-1),p(),u("discrete",i.discrete)("thumbPosition",2)("valueIndicatorText",i.endValueIndicatorText))},dependencies:[ji],styles:[`.mdc-slider__track {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  pointer-events: none;
  height: var(--mat-slider-inactive-track-height, 4px);
}

.mdc-slider__track--active,
.mdc-slider__track--inactive {
  display: flex;
  height: 100%;
  position: absolute;
  width: 100%;
}

.mdc-slider__track--active {
  overflow: hidden;
  border-radius: var(--mat-slider-active-track-shape, var(--mat-sys-corner-full));
  height: var(--mat-slider-active-track-height, 4px);
  top: calc((var(--mat-slider-inactive-track-height, 4px) - var(--mat-slider-active-track-height, 4px)) / 2);
}

.mdc-slider__track--active_fill {
  border-top-style: solid;
  box-sizing: border-box;
  height: 100%;
  width: 100%;
  position: relative;
  transform-origin: left;
  transition: transform 80ms ease;
  border-color: var(--mat-slider-active-track-color, var(--mat-sys-primary));
  border-top-width: var(--mat-slider-active-track-height, 4px);
}
.mdc-slider--disabled .mdc-slider__track--active_fill {
  border-color: var(--mat-slider-disabled-active-track-color, var(--mat-sys-on-surface));
}
[dir=rtl] .mdc-slider__track--active_fill {
  -webkit-transform-origin: right;
  transform-origin: right;
}

.mdc-slider__track--inactive {
  left: 0;
  top: 0;
  opacity: 0.24;
  background-color: var(--mat-slider-inactive-track-color, var(--mat-sys-surface-variant));
  height: var(--mat-slider-inactive-track-height, 4px);
  border-radius: var(--mat-slider-inactive-track-shape, var(--mat-sys-corner-full));
}
.mdc-slider--disabled .mdc-slider__track--inactive {
  background-color: var(--mat-slider-disabled-inactive-track-color, var(--mat-sys-on-surface));
  opacity: 0.24;
}
.mdc-slider__track--inactive::before {
  position: absolute;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border: 1px solid transparent;
  border-radius: inherit;
  content: "";
  pointer-events: none;
}
@media (forced-colors: active) {
  .mdc-slider__track--inactive::before {
    border-color: CanvasText;
  }
}

.mdc-slider__value-indicator-container {
  bottom: 44px;
  left: 50%;
  pointer-events: none;
  position: absolute;
  transform: var(--mat-slider-value-indicator-container-transform, translateX(-50%) rotate(-45deg));
}
.mdc-slider__thumb--with-indicator .mdc-slider__value-indicator-container {
  pointer-events: auto;
}

.mdc-slider__value-indicator {
  display: flex;
  align-items: center;
  transform: scale(0);
  transform-origin: var(--mat-slider-value-indicator-transform-origin, 0 28px);
  transition: transform 100ms cubic-bezier(0.4, 0, 1, 1);
  word-break: normal;
  background-color: var(--mat-slider-label-container-color, var(--mat-sys-primary));
  color: var(--mat-slider-label-label-text-color, var(--mat-sys-on-primary));
  width: var(--mat-slider-value-indicator-width, 28px);
  height: var(--mat-slider-value-indicator-height, 28px);
  padding: var(--mat-slider-value-indicator-padding, 0);
  opacity: var(--mat-slider-value-indicator-opacity, 1);
  border-radius: var(--mat-slider-value-indicator-border-radius, 50% 50% 50% 0);
}
.mdc-slider__thumb--with-indicator .mdc-slider__value-indicator {
  transition: transform 100ms cubic-bezier(0, 0, 0.2, 1);
  transform: scale(1);
}
.mdc-slider__value-indicator::before {
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid;
  bottom: -5px;
  content: "";
  height: 0;
  left: 50%;
  position: absolute;
  transform: translateX(-50%);
  width: 0;
  display: var(--mat-slider-value-indicator-caret-display, none);
  border-top-color: var(--mat-slider-label-container-color, var(--mat-sys-primary));
}
.mdc-slider__value-indicator::after {
  position: absolute;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border: 1px solid transparent;
  border-radius: inherit;
  content: "";
  pointer-events: none;
}
@media (forced-colors: active) {
  .mdc-slider__value-indicator::after {
    border-color: CanvasText;
  }
}

.mdc-slider__value-indicator-text {
  text-align: center;
  width: var(--mat-slider-value-indicator-width, 28px);
  transform: var(--mat-slider-value-indicator-text-transform, rotate(45deg));
  font-family: var(--mat-slider-label-label-text-font, var(--mat-sys-label-medium-font));
  font-size: var(--mat-slider-label-label-text-size, var(--mat-sys-label-medium-size));
  font-weight: var(--mat-slider-label-label-text-weight, var(--mat-sys-label-medium-weight));
  line-height: var(--mat-slider-label-label-text-line-height, var(--mat-sys-label-medium-line-height));
  letter-spacing: var(--mat-slider-label-label-text-tracking, var(--mat-sys-label-medium-tracking));
}

.mdc-slider__thumb {
  -webkit-user-select: none;
  user-select: none;
  display: flex;
  left: -24px;
  outline: none;
  position: absolute;
  height: 48px;
  width: 48px;
  pointer-events: none;
}
.mdc-slider--discrete .mdc-slider__thumb {
  transition: transform 80ms ease;
}
.mdc-slider--disabled .mdc-slider__thumb {
  pointer-events: none;
}

.mdc-slider__thumb--top {
  z-index: 1;
}

.mdc-slider__thumb-knob {
  position: absolute;
  box-sizing: border-box;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-style: solid;
  width: var(--mat-slider-handle-width, 20px);
  height: var(--mat-slider-handle-height, 20px);
  border-width: calc(var(--mat-slider-handle-height, 20px) / 2) calc(var(--mat-slider-handle-width, 20px) / 2);
  box-shadow: var(--mat-slider-handle-elevation, var(--mat-sys-level1));
  background-color: var(--mat-slider-handle-color, var(--mat-sys-primary));
  border-color: var(--mat-slider-handle-color, var(--mat-sys-primary));
  border-radius: var(--mat-slider-handle-shape, var(--mat-sys-corner-full));
}
.mdc-slider__thumb:hover .mdc-slider__thumb-knob {
  background-color: var(--mat-slider-hover-handle-color, var(--mat-sys-primary));
  border-color: var(--mat-slider-hover-handle-color, var(--mat-sys-primary));
}
.mdc-slider__thumb--focused .mdc-slider__thumb-knob {
  background-color: var(--mat-slider-focus-handle-color, var(--mat-sys-primary));
  border-color: var(--mat-slider-focus-handle-color, var(--mat-sys-primary));
}
.mdc-slider--disabled .mdc-slider__thumb-knob {
  background-color: var(--mat-slider-disabled-handle-color, var(--mat-sys-on-surface));
  border-color: var(--mat-slider-disabled-handle-color, var(--mat-sys-on-surface));
}
.mdc-slider__thumb--top .mdc-slider__thumb-knob, .mdc-slider__thumb--top.mdc-slider__thumb:hover .mdc-slider__thumb-knob, .mdc-slider__thumb--top.mdc-slider__thumb--focused .mdc-slider__thumb-knob {
  border: solid 1px #fff;
  box-sizing: content-box;
  border-color: var(--mat-slider-with-overlap-handle-outline-color, var(--mat-sys-on-primary));
  border-width: var(--mat-slider-with-overlap-handle-outline-width, 1px);
}

.mdc-slider__tick-marks {
  align-items: center;
  box-sizing: border-box;
  display: flex;
  height: 100%;
  justify-content: space-between;
  padding: 0 1px;
  position: absolute;
  width: 100%;
}

.mdc-slider__tick-mark--active,
.mdc-slider__tick-mark--inactive {
  width: var(--mat-slider-with-tick-marks-container-size, 2px);
  height: var(--mat-slider-with-tick-marks-container-size, 2px);
  border-radius: var(--mat-slider-with-tick-marks-container-shape, var(--mat-sys-corner-full));
}

.mdc-slider__tick-mark--inactive {
  opacity: var(--mat-slider-with-tick-marks-inactive-container-opacity, 0.38);
  background-color: var(--mat-slider-with-tick-marks-inactive-container-color, var(--mat-sys-on-surface-variant));
}
.mdc-slider--disabled .mdc-slider__tick-mark--inactive {
  opacity: var(--mat-slider-with-tick-marks-inactive-container-opacity, 0.38);
  background-color: var(--mat-slider-with-tick-marks-disabled-container-color, var(--mat-sys-on-surface));
}

.mdc-slider__tick-mark--active {
  opacity: var(--mat-slider-with-tick-marks-active-container-opacity, 0.38);
  background-color: var(--mat-slider-with-tick-marks-active-container-color, var(--mat-sys-on-primary));
}

.mdc-slider__input {
  cursor: pointer;
  left: 2px;
  margin: 0;
  height: 44px;
  opacity: 0;
  position: absolute;
  top: 2px;
  width: 44px;
  box-sizing: content-box;
}
.mdc-slider__input.mat-mdc-slider-input-no-pointer-events {
  pointer-events: none;
}
.mdc-slider__input.mat-slider__right-input {
  left: auto;
  right: 0;
}

.mat-mdc-slider {
  display: inline-block;
  box-sizing: border-box;
  outline: none;
  vertical-align: middle;
  cursor: pointer;
  height: 48px;
  margin: 0 8px;
  position: relative;
  touch-action: pan-y;
  width: auto;
  min-width: 112px;
  -webkit-tap-highlight-color: transparent;
}
.mat-mdc-slider.mdc-slider--disabled {
  cursor: auto;
  opacity: 0.38;
}
.mat-mdc-slider.mdc-slider--disabled .mdc-slider__input {
  cursor: auto;
}
.mat-mdc-slider .mdc-slider__thumb,
.mat-mdc-slider .mdc-slider__track--active_fill {
  transition-duration: 0ms;
}
.mat-mdc-slider.mat-mdc-slider-with-animation .mdc-slider__thumb,
.mat-mdc-slider.mat-mdc-slider-with-animation .mdc-slider__track--active_fill {
  transition-duration: 80ms;
}
.mat-mdc-slider.mdc-slider--discrete .mdc-slider__thumb,
.mat-mdc-slider.mdc-slider--discrete .mdc-slider__track--active_fill {
  transition-duration: 0ms;
}
.mat-mdc-slider.mat-mdc-slider-with-animation .mdc-slider__thumb,
.mat-mdc-slider.mat-mdc-slider-with-animation .mdc-slider__track--active_fill {
  transition-duration: 80ms;
}
.mat-mdc-slider .mat-ripple .mat-ripple-element {
  background-color: var(--mat-slider-ripple-color, var(--mat-sys-primary));
}
.mat-mdc-slider .mat-ripple .mat-mdc-slider-hover-ripple {
  background-color: var(--mat-slider-hover-state-layer-color, color-mix(in srgb, var(--mat-sys-primary) 5%, transparent));
}
.mat-mdc-slider .mat-ripple .mat-mdc-slider-focus-ripple,
.mat-mdc-slider .mat-ripple .mat-mdc-slider-active-ripple {
  background-color: var(--mat-slider-focus-state-layer-color, color-mix(in srgb, var(--mat-sys-primary) 20%, transparent));
}
.mat-mdc-slider._mat-animation-noopable.mdc-slider--discrete .mdc-slider__thumb, .mat-mdc-slider._mat-animation-noopable.mdc-slider--discrete .mdc-slider__track--active_fill,
.mat-mdc-slider._mat-animation-noopable .mdc-slider__value-indicator {
  transition: none;
}
.mat-mdc-slider .mat-focus-indicator::before {
  border-radius: 50%;
}

.mdc-slider__thumb--focused .mat-focus-indicator::before {
  content: "";
}
`],encapsulation:2,changeDetection:0})}return n})();var qi={provide:Vt,useExisting:rt(()=>nt),multi:!0};var nt=(()=>{class n{_ngZone=c(G);_elementRef=c(j);_cdr=c(z);_slider=c(it);_platform=c(ke);_listenerCleanups;get value(){return N(this._hostElement.value,0)}set value(e){e===null&&(e=this._getDefaultValue()),e=isNaN(e)?0:e;let t=e+"";if(!this._hasSetInitialValue){this._initialValue=t;return}this._isActive||this._setValue(t)}_setValue(e){this._hostElement.value=e,this._updateThumbUIByValue(),this._slider._onValueChange(this),this._cdr.detectChanges(),this._slider._cdr.markForCheck()}valueChange=new A;dragStart=new A;dragEnd=new A;get translateX(){return this._slider.min>=this._slider.max?(this._translateX=this._tickMarkOffset,this._translateX):(this._translateX===void 0&&(this._translateX=this._calcTranslateXByValue()),this._translateX)}set translateX(e){this._translateX=e}_translateX;thumbPosition=m.END;get min(){return N(this._hostElement.min,0)}set min(e){this._hostElement.min=e+"",this._cdr.detectChanges()}get max(){return N(this._hostElement.max,0)}set max(e){this._hostElement.max=e+"",this._cdr.detectChanges()}get step(){return N(this._hostElement.step,0)}set step(e){this._hostElement.step=e+"",this._cdr.detectChanges()}get disabled(){return I(this._hostElement.disabled)}set disabled(e){this._hostElement.disabled=e,this._cdr.detectChanges(),this._slider.disabled!==this.disabled&&(this._slider.disabled=this.disabled)}get percentage(){return this._slider.min>=this._slider.max?this._slider._isRtl()?1:0:(this.value-this._slider.min)/(this._slider.max-this._slider.min)}get fillPercentage(){return this._slider._cachedWidth?this._translateX===0?0:this.translateX/this._slider._cachedWidth:this._slider._isRtl()?1:0}_hostElement=this._elementRef.nativeElement;_valuetext=K("");_knobRadius=8;_tickMarkOffset=3;_isActive=!1;_isFocused=!1;_setIsFocused(e){this._isFocused=e}_hasSetInitialValue=!1;_initialValue;_formControl;_destroyed=new X;_skipUIUpdate=!1;_onChangeFn;_onTouchedFn=()=>{};_isControlInitialized=!1;constructor(){let e=c(ce);this._ngZone.runOutsideAngular(()=>{this._listenerCleanups=[e.listen(this._hostElement,"pointerdown",this._onPointerDown.bind(this)),e.listen(this._hostElement,"pointermove",this._onPointerMove.bind(this)),e.listen(this._hostElement,"pointerup",this._onPointerUp.bind(this))]})}ngOnDestroy(){this._listenerCleanups.forEach(e=>e()),this._destroyed.next(),this._destroyed.complete(),this.dragStart.complete(),this.dragEnd.complete()}initProps(){this._updateWidthInactive(),this.disabled!==this._slider.disabled&&(this._slider.disabled=!0),this.step=this._slider.step,this.min=this._slider.min,this.max=this._slider.max,this._initValue()}initUI(){this._updateThumbUIByValue()}_initValue(){this._hasSetInitialValue=!0,this._initialValue===void 0?this.value=this._getDefaultValue():(this._hostElement.value=this._initialValue,this._updateThumbUIByValue(),this._slider._onValueChange(this),this._cdr.detectChanges())}_getDefaultValue(){return this.min}_onBlur(){this._setIsFocused(!1),this._onTouchedFn()}_onFocus(){this._slider._setTransition(!1),this._slider._updateTrackUI(this),this._setIsFocused(!0)}_onChange(){this.valueChange.emit(this.value),this._isActive&&this._updateThumbUIByValue({withAnimation:!0})}_onInput(){this._onChangeFn?.(this.value),(this._slider.step||!this._isActive)&&this._updateThumbUIByValue({withAnimation:!0}),this._slider._onValueChange(this)}_onNgControlValueChange(){(!this._isActive||!this._isFocused)&&(this._slider._onValueChange(this),this._updateThumbUIByValue()),this._slider.disabled=this._formControl.disabled}_onPointerDown(e){if(!(this.disabled||e.button!==0)){if(this._platform.IOS){let t=this._slider._isCursorOnSliderThumb(e,this._slider._getThumb(this.thumbPosition)._hostElement.getBoundingClientRect());this._isActive=t,this._updateWidthActive(),this._slider._updateDimensions();return}this._isActive=!0,this._setIsFocused(!0),this._updateWidthActive(),this._slider._updateDimensions(),this._slider.step||this._updateThumbUIByPointerEvent(e,{withAnimation:!0}),this.disabled||(this._handleValueCorrection(e),this.dragStart.emit({source:this,parent:this._slider,value:this.value}))}}_handleValueCorrection(e){this._skipUIUpdate=!0,setTimeout(()=>{this._skipUIUpdate=!1,this._fixValue(e)},0)}_fixValue(e){let t=e.clientX-this._slider._cachedLeft,i=this._slider._cachedWidth,a=this._slider.step===0?1:this._slider.step,d=Math.floor((this._slider.max-this._slider.min)/a),o=this._slider._isRtl()?1-t/i:t/i,U=Math.round(o*d)/d*(this._slider.max-this._slider.min)+this._slider.min,V=Math.round(U/a)*a,be=this.value;if(V===be){this._slider._onValueChange(this),this._slider.step>0?this._updateThumbUIByValue():this._updateThumbUIByPointerEvent(e,{withAnimation:this._slider._hasAnimation});return}this.value=V,this.valueChange.emit(this.value),this._onChangeFn?.(this.value),this._slider._onValueChange(this),this._slider.step>0?this._updateThumbUIByValue():this._updateThumbUIByPointerEvent(e,{withAnimation:this._slider._hasAnimation})}_onPointerMove(e){!this._slider.step&&this._isActive&&this._updateThumbUIByPointerEvent(e)}_onPointerUp(){this._isActive&&(this._isActive=!1,this._platform.SAFARI&&this._setIsFocused(!1),this.dragEnd.emit({source:this,parent:this._slider,value:this.value}),setTimeout(()=>this._updateWidthInactive(),this._platform.IOS?10:0))}_clamp(e){let t=this._tickMarkOffset,i=this._slider._cachedWidth-this._tickMarkOffset;return Math.max(Math.min(e,i),t)}_calcTranslateXByValue(){return this._slider._isRtl()?(1-this.percentage)*(this._slider._cachedWidth-this._tickMarkOffset*2)+this._tickMarkOffset:this.percentage*(this._slider._cachedWidth-this._tickMarkOffset*2)+this._tickMarkOffset}_calcTranslateXByPointerEvent(e){return e.clientX-this._slider._cachedLeft}_updateWidthActive(){}_updateWidthInactive(){this._hostElement.style.padding=`0 ${this._slider._inputPadding}px`,this._hostElement.style.width=`calc(100% + ${this._slider._inputPadding-this._tickMarkOffset*2}px)`,this._hostElement.style.left=`-${this._slider._rippleRadius-this._tickMarkOffset}px`}_updateThumbUIByValue(e){this.translateX=this._clamp(this._calcTranslateXByValue()),this._updateThumbUI(e)}_updateThumbUIByPointerEvent(e,t){this.translateX=this._clamp(this._calcTranslateXByPointerEvent(e)),this._updateThumbUI(t)}_updateThumbUI(e){this._slider._setTransition(!!e?.withAnimation),this._slider._onTranslateXChange(this)}writeValue(e){(this._isControlInitialized||e!==null)&&(this.value=e)}registerOnChange(e){this._onChangeFn=e,this._isControlInitialized=!0}registerOnTouched(e){this._onTouchedFn=e}setDisabledState(e){this.disabled=e}focus(){this._hostElement.focus()}blur(){this._hostElement.blur()}static \u0275fac=function(t){return new(t||n)};static \u0275dir=O({type:n,selectors:[["input","matSliderThumb",""]],hostAttrs:["type","range",1,"mdc-slider__input"],hostVars:1,hostBindings:function(t,i){t&1&&x("change",function(){return i._onChange()})("input",function(){return i._onInput()})("blur",function(){return i._onBlur()})("focus",function(){return i._onFocus()}),t&2&&J("aria-valuetext",i._valuetext())},inputs:{value:[2,"value","value",N]},outputs:{valueChange:"valueChange",dragStart:"dragStart",dragEnd:"dragEnd"},exportAs:["matSliderThumb"],features:[B([qi,{provide:di,useExisting:n}])]})}return n})();var mi=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=Z({type:n});static \u0275inj=Q({imports:[It,Re]})}return n})();var hi=[{value:"system",label:"System"},{value:"light-theme",label:"Light"},{value:"dark-theme",label:"Dark"}];var Gi=["displayForm"],Ki=(n,h)=>h.value;function Zi(n,h){if(n&1&&(r(0,"mat-panel-description",6),l(1," Adjust night mode settings to enhance visibility in low-light environments. "),s()),n&2){let e=C();u("hidden",e.isPhonePortrait().matches)}}function Ji(n,h){n&1&&(r(0,"mat-panel-description"),l(1," Choose light, dark, or follow the device theme. "),s())}function Yi(n,h){if(n&1&&(r(0,"mat-button-toggle",13),l(1),s()),n&2){let e=h.$implicit;u("value",e.value),p(),ee(e.label)}}function $i(n,h){n&1&&(r(0,"mat-panel-description"),l(1," Set the browser tab title to tell multiple Skip instances apart. "),s())}function en(n,h){n&1&&(r(0,"mat-panel-description"),l(1," Configure remote dashboard operations between Skip instances. "),s())}function tn(n,h){n&1&&(r(0,"mat-error"),l(1,"This field is required."),s())}function nn(n,h){if(n&1&&(r(0,"mat-panel-description",6),l(1," Keep the display on while Skip is in the foreground. "),s()),n&2){let e=C();u("hidden",e.isPhonePortrait().matches)}}function an(n,h){n&1&&l(0," Prevents the device screen from blanking on its inactivity timer while Skip is the foreground app. ")}function on(n,h){n&1&&l(0," This device or browser does not support the screen wake lock (a secure HTTPS connection is required). ")}function sn(n,h){n&1&&(r(0,"mat-panel-description"),l(1," Choose whether the toolbar slides down on its own. "),s())}var ui=(()=>{class n{DERIVED_DATA_PLUGIN_ID="derived-data";themeModes=hi;displayForm=te("displayForm");app=c(jt);toast=c(ne);settings=c(ae);uiEvent=c($t);responsive=c(Ie);pluginConfig=c(qt);auth=c(Ne);destroyRef=c(ct);isPhonePortrait;nightBrightness=K(.27);autoNightMode=H(!1);isRedNightMode=H(!1);themeMode=H("dark-theme");isRemoteControl=H(!1);instanceName=H("");browserTabTitle=H("Skip");keepScreenAwake=H(!0);autoRevealToolbar=H(!0);_pluginCheckSeq=0;constructor(){this.isPhonePortrait=q(this.responsive.observe(Ae.HandsetPortrait),{initialValue:{matches:!1,breakpoints:{}}})}ngOnInit(){this.nightBrightness.set(this.settings.getNightModeBrightness()),this.autoNightMode.set(this.settings.getAutoNightMode());let e=this.settings.getThemeName();this.themeMode.set(e==="light-theme"||e==="system"?e:"dark-theme"),this.isRedNightMode.set(this.settings.getRedNightMode()),this.isRemoteControl.set(this.settings.getIsRemoteControl()),this.instanceName.set(this.settings.getInstanceName()),this.browserTabTitle.set(this.settings.getBrowserTabTitle()),this.keepScreenAwake.set(this.settings.getKeepScreenAwake()),this.autoRevealToolbar.set(this.settings.getAutoRevealToolbar())}saveAllSettings(){let e=this.displayForm();if(!e||e.invalid){e?.form.markAllAsTouched(),this.toast.show("Please fill out required fields before saving.",3e3,!0);return}let t=++this._pluginCheckSeq;if(this.autoNightMode()){this.validateAndSaveSettings(t);return}this.applyAndSaveSettings()}applyAndSaveSettings(e=!0){this.settings.setAutoNightMode(this.autoNightMode()),this.settings.setRedNightMode(this.isRedNightMode()),this.settings.setNightModeBrightness(this.nightBrightness()),this.settings.setIsRemoteControl(this.isRemoteControl()),this.isRemoteControl()?this.settings.setInstanceName(this.instanceName()):this.settings.setInstanceName(""),this.app.isNightMode()||this.app.setBrightness(1),this.settings.setThemeName(this.themeMode()),this.settings.setBrowserTabTitle(this.browserTabTitle()),this.settings.setKeepScreenAwake(this.keepScreenAwake()),this.settings.setAutoRevealToolbar(this.autoRevealToolbar()),this.displayForm()?.form.markAsPristine(),e&&this.toast.show("Configuration saved",1e3,!0,"message")}validateAndSaveSettings(e){return P(this,null,function*(){let t=yield this.validateAndHandleAutoNightRequirement(e);e===this._pluginCheckSeq&&(t!=="granted"&&this.autoNightMode.set(this.settings.getAutoNightMode()),this.applyAndSaveSettings(t!=="explained"))})}isAutoNightModeSupported(e){this.displayForm()?.form.markAsDirty(),this.autoNightMode.set(e.checked)}validateAndHandleAutoNightRequirement(e){return P(this,null,function*(){let t=yield this.pluginConfig.getPlugin(this.DERIVED_DATA_PLUGIN_ID);if(e!==this._pluginCheckSeq)return"declined";if(!t.ok){let V=t;return V.error.reason==="not-found"?(this.toast.show("Automatic Night Mode requires the Signal K Derived Data plugin. This requirement is missing and must be installed manually by the user.",0,!1,"error"),"explained"):(this.toast.show(`Failed to validate Automatic Night Mode requirements: ${V.error.message}`,0,!1,"error"),"explained")}let i=t.data,a=this.resolveEnvironmentSunFlagPath(i.state.configuration),d=this.readBooleanByPath(i.state.configuration,a)===!0;if(i.state.enabled&&d)return"granted";let o=!i.state.enabled,y=!d,U;return o&&y?U="To enable Automatic Night Mode, the Derived Data plugin must be enabled and the environment.sun path must be set to true. Do you wish to enable & and activate the path?":o?U="To enable Automatic Night Mode, the Derived Data plugin must be enabled. Do you wish to enable the plugin?":U="To enable Automatic Night Mode, the environment.sun path in the Derived Data plugin must be activated. Do you wish to activate the path?",new Promise(V=>{let be=this.toast.show(U,0,!1,"warn","Ok");be.onAction().pipe(Ze(this.destroyRef)).subscribe(()=>{this.enableAndConfigureAutoNight(i,a,e,V)}),be.afterDismissed().pipe(Ze(this.destroyRef)).subscribe(gi=>{gi.dismissedByAction||V("declined")})})})}enableAndConfigureAutoNight(e,t,i,a){return P(this,null,function*(){if(!this.auth.canWriteUserData()){this.toast.show("Automatic night mode needs the Derived Data plugin enabled, which requires signing in as an administrator.",4e3,!0,"warn"),a("declined");return}let d=this.cloneConfig(e.state.configuration);this.writeBooleanByPath(d,t,!0);let o=yield this.pluginConfig.savePluginConfig(e.id,{configuration:d,enabled:!0});if(i!==this._pluginCheckSeq){a("declined");return}if(!o.ok){let y=o;this.toast.show(`Failed to enable and configure Derived Data plugin: ${y.error.message}`,0,!1,"error"),a("explained");return}this.toast.show("Automatic Night Mode dependency enabled and configured.",3e3,!0,"success"),a("granted")})}resolveEnvironmentSunFlagPath(e){return this.findBooleanSunPath(e)??["sun"]}findBooleanSunPath(e,t=[]){let i=Object.entries(e).find(([a,d])=>a.toLowerCase()==="sun"&&typeof d=="boolean");if(i)return[...t,i[0]];for(let[a,d]of Object.entries(e)){if(typeof d=="boolean"&&a.toLowerCase().includes("sun"))return[...t,a];if(d&&typeof d=="object"&&!Array.isArray(d)){let o=this.findBooleanSunPath(d,[...t,a]);if(o)return o}}return null}readBooleanByPath(e,t){let i=e;for(let a of t){if(!i||typeof i!="object"||Array.isArray(i))return null;i=i[a]}return typeof i=="boolean"?i:null}writeBooleanByPath(e,t,i){if(t.length===0)return;let a=e;for(let d=0;d<t.length-1;d++){let o=t[d],y=a[o];(!y||typeof y!="object"||Array.isArray(y))&&(a[o]={}),a=a[o]}a[t[t.length-1]]=i}cloneConfig(e){return JSON.parse(JSON.stringify(e||{}))}setBrightness(e){this.displayForm()?.form.markAsDirty(),this.nightBrightness.set(e),this.app.setBrightness(e,this.app.isNightMode())}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=T({type:n,selectors:[["settings-display"]],viewQuery:function(t,i){t&1&&we(i.displayForm,Gi,5),t&2&&Se()},inputs:{autoNightMode:[1,"autoNightMode"],isRedNightMode:[1,"isRedNightMode"],themeMode:[1,"themeMode"],isRemoteControl:[1,"isRemoteControl"],instanceName:[1,"instanceName"],browserTabTitle:[1,"browserTabTitle"],keepScreenAwake:[1,"keepScreenAwake"],autoRevealToolbar:[1,"autoRevealToolbar"]},outputs:{autoNightMode:"autoNightModeChange",isRedNightMode:"isRedNightModeChange",themeMode:"themeModeChange",isRemoteControl:"isRemoteControlChange",instanceName:"instanceNameChange",browserTabTitle:"browserTabTitleChange",keepScreenAwake:"keepScreenAwakeChange",autoRevealToolbar:"autoRevealToolbarChange"},decls:77,vars:25,consts:[["displayForm","ngForm"],["redNightModeToggle",""],["inputBrightness",""],["isRemoteControlCb",""],["instanceNameModel","ngModel"],["id","displaySetting",3,"ngSubmit"],[3,"hidden"],["name","autoNightMode",1,"full-width","sliders",3,"change","ngModelChange","ngModel"],["name","redNightMode",1,"full-width","sliders",3,"ngModelChange","ngModel"],[2,"padding-left","10px"],["min","0","max","1","step","0.01","discrete","",3,"disabled"],["matSliderThumb","",3,"input","value","disabled"],["name","themeMode","aria-label","Theme","hideSingleSelectionIndicator","",1,"full-width","theme-toggle",3,"ngModelChange","ngModel"],[3,"value"],[1,"optional-field"],["matInput","","name","browserTabTitle","placeholder","Ex. Mast-Skip",3,"ngModelChange","ngModel"],["name","isRemoteControl",1,"full-width",3,"ngModelChange","ngModel"],["matInput","","name","instanceName","placeholder","Ex. Mast",3,"ngModelChange","ngModel","disabled","required"],["name","keepScreenAwake","aria-describedby","keep-awake-helper",1,"full-width","sliders",3,"ngModelChange","ngModel","disabled"],["id","keep-awake-helper","role","note",1,"mat-body-small"],["name","autoRevealToolbar","aria-describedby","auto-reveal-toolbar-helper",1,"full-width","sliders",3,"ngModelChange","ngModel"],["id","auto-reveal-toolbar-helper","role","note",1,"mat-body-small"],[1,"formActionFooter"],[1,"formActionDivider"],["mat-flat-button","","type","submit",1,"formActionButton",3,"disabled"]],template:function(t,i){if(t&1){let a=F();r(0,"form",5,0),x("ngSubmit",function(){return i.saveAllSettings()}),r(2,"p"),l(3,"Customize your display settings to enable various integrations, improve visibility and adapt to various lighting conditions."),s(),r(4,"mat-accordion")(5,"mat-expansion-panel")(6,"mat-expansion-panel-header")(7,"mat-panel-title"),l(8," Night Mode "),s(),b(9,Zi,2,1,"mat-panel-description",6),s(),r(10,"mat-slide-toggle",7),x("change",function(o){return i.isAutoNightModeSupported(o)}),M("ngModelChange",function(o){return g(a),S(i.autoNightMode,o)||(i.autoNightMode=o),f(o)}),l(11," Automatically activate day and night modes based on sun phases. "),s(),r(12,"mat-slide-toggle",8,1),M("ngModelChange",function(o){return g(a),S(i.isRedNightMode,o)||(i.isRedNightMode=o),f(o)}),l(14," Enable red-only night mode. "),s(),r(15,"div",9),_(16,"br"),r(17,"span"),l(18,"Adjust Night Mode Brightness"),s(),_(19,"br"),r(20,"mat-slider",10)(21,"input",11,2),x("input",function(){g(a);let o=R(22);return f(i.setBrightness(+o.value))}),s()()()(),r(23,"mat-expansion-panel")(24,"mat-expansion-panel-header")(25,"mat-panel-title"),l(26," Theme "),s(),b(27,Ji,2,0,"mat-panel-description"),s(),r(28,"mat-button-toggle-group",12),M("ngModelChange",function(o){return g(a),S(i.themeMode,o)||(i.themeMode=o),f(o)}),Y(29,Yi,2,2,"mat-button-toggle",13,Ki),s()(),r(31,"mat-expansion-panel")(32,"mat-expansion-panel-header")(33,"mat-panel-title"),l(34," Browser Tab "),s(),b(35,$i,2,0,"mat-panel-description"),s(),r(36,"mat-form-field",14)(37,"mat-label"),l(38,"Browser tab title"),s(),r(39,"input",15),x("ngModelChange",function(){g(a);let o=R(1);return f(o.form.markAsDirty())}),M("ngModelChange",function(o){return g(a),S(i.browserTabTitle,o)||(i.browserTabTitle=o),f(o)}),s()()(),r(40,"mat-expansion-panel")(41,"mat-expansion-panel-header")(42,"mat-panel-title"),l(43," Remote Control "),s(),b(44,en,2,0,"mat-panel-description"),s(),r(45,"mat-slide-toggle",16,3),M("ngModelChange",function(o){return g(a),S(i.isRemoteControl,o)||(i.isRemoteControl=o),f(o)}),l(47," Allow remote Skip instances to view and control this dashboard. "),s(),r(48,"mat-form-field",14)(49,"mat-label"),l(50,"Name of this instance"),s(),r(51,"input",17,4),x("ngModelChange",function(){g(a);let o=R(1);return f(o.form.markAsDirty())}),M("ngModelChange",function(o){return g(a),S(i.instanceName,o)||(i.instanceName=o),f(o)}),s(),b(53,tn,2,0,"mat-error"),s()(),r(54,"mat-expansion-panel")(55,"mat-expansion-panel-header")(56,"mat-panel-title"),l(57," Screen "),s(),b(58,nn,2,1,"mat-panel-description",6),s(),r(59,"mat-slide-toggle",18),M("ngModelChange",function(o){return g(a),S(i.keepScreenAwake,o)||(i.keepScreenAwake=o),f(o)}),l(60," Keep screen awake "),s(),r(61,"p",19),b(62,an,1,0)(63,on,1,0),s()(),r(64,"mat-expansion-panel")(65,"mat-expansion-panel-header")(66,"mat-panel-title"),l(67," Toolbar "),s(),b(68,sn,2,0,"mat-panel-description"),s(),r(69,"mat-slide-toggle",20),M("ngModelChange",function(o){return g(a),S(i.autoRevealToolbar,o)||(i.autoRevealToolbar=o),f(o)}),l(70," Show the toolbar automatically "),s(),r(71,"p",21),l(72," The toolbar appears at startup and on every page change, then hides again. With this off it appears only when you ask for it, which suits a display you only watch. Applies to every display using this configuration profile. "),s()()(),r(73,"div",22),_(74,"mat-divider",23),r(75,"button",24),l(76,"Save"),s()()()}if(t&2){let a=R(1),d=R(13),o=R(46),y=R(52);p(9),v(i.isPhonePortrait().matches?-1:9),p(),w("ngModel",i.autoNightMode),p(2),w("ngModel",i.isRedNightMode),p(5),ue(d.checked?"mat-body-medium disable-color":"mat-body-medium"),p(3),u("disabled",d.checked),p(),u("value",i.nightBrightness())("disabled",d.checked),p(6),v(i.isPhonePortrait().matches?-1:27),p(),w("ngModel",i.themeMode),p(),$(i.themeModes),p(6),v(i.isPhonePortrait().matches?-1:35),p(4),w("ngModel",i.browserTabTitle),p(5),v(i.isPhonePortrait().matches?-1:44),p(),w("ngModel",i.isRemoteControl),p(6),w("ngModel",i.instanceName),u("disabled",!o.checked)("required",o.checked),p(2),v(o.checked&&y.invalid&&(y.touched||a.submitted)?53:-1),p(5),v(i.isPhonePortrait().matches?-1:58),p(),w("ngModel",i.keepScreenAwake),u("disabled",!i.uiEvent.noSleepSupported()),p(3),v(i.uiEvent.noSleepSupported()?62:63),p(6),v(i.isPhonePortrait().matches?-1:68),p(),w("ngModel",i.autoRevealToolbar),p(6),u("disabled",!a.form.dirty||a.form.invalid)}},dependencies:[oe,Fe,Ot,Ve,Oe,Bt,Ue,Be,zt,se,At,ie,mi,pi,nt,qe,je,ge,fe,Xe,ze,Ht,Lt,Wt,Ut,Ft,He,Le,Kt,Qt,Gt],styles:[".optional-field[_ngcontent-%COMP%]{margin-left:55px;margin-top:10px}.theme-toggle[_ngcontent-%COMP%]   mat-button-toggle[_ngcontent-%COMP%]{flex:1 1 0}.sliders[_ngcontent-%COMP%]{margin:5px 0}.disable-color[_ngcontent-%COMP%]{color:var(--mat-sys-outline)}.radio-group[_ngcontent-%COMP%]{display:flex;flex-direction:column;margin:5px 0 15px;align-items:flex-start}.radio-button[_ngcontent-%COMP%]{margin:5px}.warning[_ngcontent-%COMP%]{background-color:var(--mat-sys-on-error-container);color:var(--mat-sys-error-container);padding:1px 14px;border-radius:var(--mat-sys-corner-small)}.warning[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{font:var(--mat-sys-body-medium);letter-spacing:var(--mat-sys-body-medium-tracking)}"]})}return n})();var rn=(n,h)=>h.name;function ln(n,h){n&1&&_(0,"mat-icon",28)}function dn(n,h){n&1&&(r(0,"span",29),l(1,"Active on this device"),s())}function cn(n,h){if(n&1){let e=F();r(0,"button",34),x("click",function(){g(e);let i=C().$implicit,a=C(2);return f(a.switchProfile(i.name))}),l(1,"Switch"),s()}}function pn(n,h){if(n&1){let e=F();r(0,"div",26)(1,"div",27),b(2,ln,1,0,"mat-icon",28),r(3,"span"),l(4),s(),b(5,dn,2,0,"span",29),s(),r(6,"div",30),b(7,cn,2,0,"button",31),r(8,"button",32),x("click",function(){let i=g(e).$implicit,a=C(2);return f(a.renameProfile(i.name))}),l(9,"Rename"),s(),r(10,"button",32),x("click",function(){let i=g(e).$implicit,a=C(2);return f(a.duplicateProfile(i.name))}),l(11,"Duplicate"),s(),r(12,"button",33),x("click",function(){let i=g(e).$implicit,a=C(2);return f(a.deleteProfile(i.name))}),l(13," Delete "),s()()()}if(n&2){let e=h.$implicit,t=C(2);L("active",e.isActive),p(2),v(e.isActive?2:-1),p(2),ee(e.name),p(),v(e.isActive?5:-1),p(2),v(e.isActive?-1:7),p(),u("disabled",!t.canWriteUserData()),p(2),u("disabled",!t.canWriteUserData()),p(2),u("disabled",e.isActive||e.name==="default"||t.profiles().length<=1||!t.canWriteUserData())}}function mn(n,h){n&1&&(r(0,"p",22),l(1,"No profiles found yet."),s())}function hn(n,h){n&1&&(r(0,"p",22),l(1,"Read-only session \u2014 profile changes are disabled."),s())}function un(n,h){if(n&1){let e=F();_(0,"mat-divider"),r(1,"div",20),Y(2,pn,14,9,"div",21,rn,!1,mn,2,0,"p",22),s(),r(5,"div",23),_(6,"mat-divider",24),r(7,"button",25),x("click",function(){g(e);let i=C();return f(i.createProfile())}),l(8,"New"),s(),b(9,hn,2,0,"p",22),s()}if(n&2){let e=C();p(2),$(e.profiles()),p(5),u("disabled",!e.canWriteUserData()),p(2),v(e.canWriteUserData()?-1:9)}}function _n(n,h){n&1&&(r(0,"div",5)(1,"p"),l(2,"Profiles require logging in to Signal K with a user account."),s()())}var _i=(()=>{class n{settings=c(ae);storageSvc=c(Rt);toast=c(ne);auth=c(Ne);profileService=c(ti);dialog=c(Yt);isUserSession=q(this.auth.isUserSession$,{initialValue:!1});pageTitle="Profiles";supportApplicationData=this.storageSvc.isAppDataSupported;profilesAvailable=Te(()=>this.supportApplicationData&&this.isUserSession());canWriteUserData=q(this.auth.canWriteUserData$,{initialValue:!1});profiles=this.profileService.profiles;profileLoadEffect=pt(()=>{this.profilesAvailable()&&this.profileService.refresh().catch(e=>this.reportError(e))});switchProfile(e){return P(this,null,function*(){if(yield Qe(this.dialog.openConfirmationDialog({title:"Switch profile",message:`Switch this device to "${e}"? Skip will reload to load the profile.`,confirmBtnText:"Switch",cancelBtnText:"Cancel"})))try{yield this.profileService.switchProfile(e)}catch(i){this.reportError(i)}})}createProfile(){this.dialog.openNameDialog({title:"New profile",name:"",description:"The profile starts from the pages shipped with this version of Skip. Skip switches to it and reloads; you can change everything in it afterwards.",confirmBtnText:"Create",cancelBtnText:"Cancel"}).afterClosed().subscribe(e=>P(this,null,function*(){if(e?.name)try{yield this.profileService.createProfile(e.name)}catch(t){this.reportError(t)}}))}renameProfile(e){this.dialog.openNameDialog({title:"Rename profile",name:e,confirmBtnText:"Rename",cancelBtnText:"Cancel"}).afterClosed().subscribe(t=>P(this,null,function*(){if(!(!t?.name||t.name===e))try{yield this.profileService.renameProfile(e,t.name)}catch(i){this.reportError(i)}}))}duplicateProfile(e){this.dialog.openNameDialog({title:"Duplicate profile",name:`${e} copy`,description:`The copy starts as an exact copy of "${e}", which is left untouched. Skip switches to the copy and reloads.`,confirmBtnText:"Duplicate",cancelBtnText:"Cancel"}).afterClosed().subscribe(t=>P(this,null,function*(){if(t?.name)try{yield this.profileService.duplicateProfile(e,t.name)}catch(i){this.reportError(i)}}))}deleteProfile(e){return P(this,null,function*(){if(yield Qe(this.dialog.openConfirmationDialog({title:"Delete profile",message:`Permanently delete profile "${e}"? This cannot be undone.`,confirmBtnText:"Delete",cancelBtnText:"Cancel"})))try{yield this.profileService.deleteProfile(e)}catch(i){this.reportError(i)}})}getActiveConfig(){return{app:this.settings.getAppConfig(),dashboards:this.settings.getDashboardConfig(),theme:this.settings.getThemeConfig()}}downloadJsonConfig(){let e=JSON.stringify(this.getActiveConfig(),null,2),t=new Blob([e],{type:"application/json"}),i=window.URL.createObjectURL(t),a=document.createElement("a");a.href=i,a.download="SkipConfig.json",document.body.appendChild(a),a.click(),document.body.removeChild(a),window.URL.revokeObjectURL(i)}uploadJsonConfig(e){let t=e.target,i=t.files?.[0];if(!i||i.type!=="application/json"){this.toast.show("Please select a valid JSON file",0,!1,"error");return}let a=new FileReader;a.onload=d=>{let o;try{o=JSON.parse(d.target?.result)}catch(y){this.toast.show("File does not contain valid JSON.",0,!1,"error"),console.error("Invalid JSON file format:",y);return}this.dialog.openNameDialog({title:"Import as new profile",name:"",confirmBtnText:"Import",cancelBtnText:"Cancel"}).afterClosed().subscribe(y=>P(this,null,function*(){if(y?.name)try{let V=(yield this.profileService.importProfile(y.name,o))?`Profile "${y.name}" imported and migrated to the current version`:`Profile "${y.name}" imported`;this.toast.show(V,1e3,!0,"success")}catch(U){this.reportError(U)}}))},a.onerror=()=>{this.toast.show("Could not read the selected file.",0,!1,"error"),console.error("File read error:",a.error)},a.readAsText(i),t.value=""}resetConfigToDefault(){this.settings.resetSettings()}resetConnectionToDefault(){this.settings.resetConnection()}reportError(e){let t=e instanceof Error?e.message:String(e);this.toast.show(t,0,!1,"error")}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=T({type:n,selectors:[["settings-config"]],decls:47,vars:3,consts:[["fileInput",""],[1,"page-content"],["routerLink","/help/configuration"],[1,"flex-container"],[1,"flex-item-rounded-card","rounded-card-color"],[1,"no-token-notice"],[1,"flex-item-reset","rounded-card-color"],[1,"config-operation-container",2,"margin-top","20px"],[1,"download-txt"],[1,"download-btn","btn-div"],["mat-flat-button","","type","button",1,"adv-btn",3,"click"],[1,"upload-txt"],[1,"upload-btn","btn-div"],["type","file","accept",".json","hidden","",3,"change"],["mat-flat-button","",1,"adv-btn",3,"click","disabled"],[1,"reset-txt"],[1,"reset-btn","btn-div"],["mat-flat-button","","type","button",1,"adv-btn",3,"click","disabled"],[1,"config-txt"],[1,"config-btn","btn-div"],[1,"profile-list"],[1,"profile-row",3,"active"],[1,"empty-note"],[1,"formActionFooter"],[1,"formActionDivider"],["mat-flat-button","","color","accent",3,"click","disabled"],[1,"profile-row"],[1,"profile-name"],["svgIcon","dashboard-dashboard",1,"active-icon"],[1,"active-tag"],[1,"profile-actions"],["mat-button","","color","accent"],["mat-button","",3,"click","disabled"],["mat-button","","color","warn",3,"click","disabled"],["mat-button","","color","accent",3,"click"]],template:function(t,i){if(t&1){let a=F();r(0,"div",1)(1,"p"),l(2," A profile is a named set of pages, layouts and theme. Switching is remembered "),r(3,"strong"),l(4,"on this device only"),s(),l(5,", so each display can show a different profile from the same Signal K login. See the "),r(6,"a",2),l(7,"Login and Configuration"),s(),l(8," help section. "),s(),r(9,"div",3)(10,"div",4)(11,"h3"),l(12,"Profiles"),s(),b(13,un,10,3)(14,_n,3,0,"div",5),s(),r(15,"div",6)(16,"h3"),l(17,"Advanced"),s(),r(18,"div",7)(19,"div",8),l(20," Download a copy of the active profile's configuration to a file, for backup or to move it to another Signal K server. "),s(),r(21,"div",9)(22,"button",10),x("click",function(){return i.downloadJsonConfig()}),l(23,"Download"),s()(),r(24,"div",11),l(25," Import a Skip configuration file as a "),r(26,"strong"),l(27,"new profile"),s(),l(28,". This never overwrites an existing profile. "),s(),r(29,"div",12)(30,"input",13,0),x("change",function(o){return i.uploadJsonConfig(o)}),s(),r(32,"button",14),x("click",function(){g(a);let o=R(31);return f(o.click())}),l(33,"Import"),s()(),r(34,"div",15),l(35," Reset the active profile to defaults (a single Getting Started widget). Your Signal K connection settings remain. "),_(36,"br"),r(37,"strong"),l(38,"WARNING: This replaces the active profile's configuration."),s()(),r(39,"div",16)(40,"button",17),x("click",function(){return i.resetConfigToDefault()}),l(41,"Default"),s()(),r(42,"div",18),l(43," Clear the stored connection settings. This does not affect your profiles. "),s(),r(44,"div",19)(45,"button",10),x("click",function(){return i.resetConnectionToDefault()}),l(46,"Connection"),s()()()()()()}t&2&&(p(13),v(i.profilesAvailable()?13:14),p(19),u("disabled",!i.canWriteUserData()),p(8),u("disabled",!i.canWriteUserData()))},dependencies:[Nt,oe,se,ie,Dt,Pt],styles:['[_nghost-%COMP%]{display:block;height:100%;width:100%}.page-content[_ngcontent-%COMP%]{width:100%;overflow-y:auto;scroll-behavior:smooth;padding:0 0 10px}.flex-item-copy[_ngcontent-%COMP%]{flex:2 1 41%;padding:10px 20px;border-radius:15px}.flex-item-reset[_ngcontent-%COMP%]{flex:1 1 100%;padding:10px 20px;border-radius:15px}h3[_ngcontent-%COMP%]{margin-top:5px}a[_ngcontent-%COMP%]{font-size:14px}a[_ngcontent-%COMP%]:hover{text-decoration:underline;cursor:pointer}a[_ngcontent-%COMP%]:link, a[_ngcontent-%COMP%]:visited{color:#8ab4f8;text-decoration:none}.warningText[_ngcontent-%COMP%]{padding-left:15px}.no-token-notice[_ngcontent-%COMP%]{height:58px;contain:content;text-align:center;font-style:italic}.mat-mdc-radio-button[_ngcontent-%COMP%] ~ .mat-radio-button[_ngcontent-%COMP%]{margin-right:16px;margin-left:16px}.config-column[_ngcontent-%COMP%]{display:flex;flex-direction:column;flex-basis:100%;flex:1;margin:0 10px}.sources-radio-group[_ngcontent-%COMP%]{display:flex;flex-direction:column;margin:15px 0}.sources-radio-button[_ngcontent-%COMP%]{margin:5px;margin-left:0!important}.select-config[_ngcontent-%COMP%]{margin-left:0}.config-row[_ngcontent-%COMP%]{display:flex;flex-direction:row;flex-wrap:wrap;width:100%}.btn-div[_ngcontent-%COMP%]{align-self:center}.adv-btn[_ngcontent-%COMP%]{width:100%}.config-operation-container[_ngcontent-%COMP%]{display:grid;grid-template-columns:[col-start] auto [col1-end] min-content [col2-end];grid-template-rows:[row-start] max-content [row1-end] max-content [row2-end];grid-template-areas:"download-txt download-btn" "upload-txt upload-btn" "reset-txt reset-btn" "config-txt config-btn";row-gap:20px;column-gap:10px}.upload-txt[_ngcontent-%COMP%]{grid-area:upload-txt}.upload-btn[_ngcontent-%COMP%]{grid-area:upload-btn}.download-txt[_ngcontent-%COMP%]{grid-area:download-txt}.download-btn[_ngcontent-%COMP%]{grid-area:download-btn}.reset-txt[_ngcontent-%COMP%]{grid-area:reset-txt}.reset-btn[_ngcontent-%COMP%]{grid-area:reset-btn}.config-txt[_ngcontent-%COMP%]{grid-area:config-txt}.config-btn[_ngcontent-%COMP%]{grid-area:config-btn}.profile-list[_ngcontent-%COMP%]{display:flex;flex-direction:column;margin-top:8px}.profile-row[_ngcontent-%COMP%]{display:flex;flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:8px 4px;border-bottom:1px solid var(--mat-sys-outline-variant)}.profile-row.active[_ngcontent-%COMP%]{font-weight:500}.profile-name[_ngcontent-%COMP%]{display:flex;align-items:center;gap:8px;min-width:0}.active-icon[_ngcontent-%COMP%]{flex:0 0 auto}.active-tag[_ngcontent-%COMP%]{font-size:12px;font-style:italic;opacity:.7}.profile-actions[_ngcontent-%COMP%]{display:flex;flex-direction:row;flex-wrap:wrap}.empty-note[_ngcontent-%COMP%]{font-style:italic;opacity:.7;padding:8px 4px}']})}return n})();var Mo=(()=>{class n{pageTitle="Settings";constructor(){}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=T({type:n,selectors:[["tabs"]],decls:8,vars:1,consts:[["svgIconId","settings",3,"pageTitle"],[1,"content-area"],["label","Display"],[1,"tab-content"],["label","Notifications & Audio"],["label","Configurations"]],template:function(t,i){t&1&&(_(0,"page-header",0),r(1,"mat-tab-group",1)(2,"mat-tab",2),_(3,"settings-display",3),s(),r(4,"mat-tab",4),_(5,"settings-notifications",3),s(),r(6,"mat-tab",5),_(7,"settings-config",3),s()()),t&2&&u("pageTitle",i.pageTitle)},dependencies:[Jt,Zt,li,ui,_i,ei],styles:["[_nghost-%COMP%]{display:block;height:100%;width:100%}.content-area[_ngcontent-%COMP%]{height:calc(100% - 63px);overflow:hidden;width:100%;padding:0 24px}.tab-content[_ngcontent-%COMP%]{overflow-y:auto;width:100%;scroll-behavior:smooth;display:block}"]})}return n})();export{Mo as TabsComponent};
