import{a as Ze}from"./chunk-6LLRVMLE.js";import{a as Ue}from"./chunk-YV2YBSQN.js";import{m as He,o as Ge,p as $e}from"./chunk-RRGGMH65.js";import"./chunk-S3L7IWZZ.js";import{a as Qe,b as We}from"./chunk-RN3JTF4B.js";import"./chunk-UKNBRRH6.js";import"./chunk-NLI4NHKU.js";import"./chunk-UVUM4TWZ.js";import{a as qe}from"./chunk-5I36YEDI.js";import"./chunk-MH5BCD5P.js";import{n as ze}from"./chunk-K3X4T4HA.js";import"./chunk-HNE4YS45.js";import{a as Pe,b as P,c as Ae,d as me}from"./chunk-3NOF2XKB.js";import{b as Oe,c as je}from"./chunk-FV475IDC.js";import{D as Ne,E as S,P as Ve,f as le,h as Ie,l as Ee,m as Te,p as Re}from"./chunk-BZCKGPOI.js";import{i as Fe,j as Be}from"./chunk-BAZECE27.js";import{a as H}from"./chunk-QGZBTYGQ.js";import"./chunk-GN3JT7IS.js";import{b as Le}from"./chunk-HNABFYRR.js";import"./chunk-VQODOO6P.js";import"./chunk-JPULYVUU.js";import"./chunk-JV3ZYNOD.js";import{a as q}from"./chunk-AHJJRFXE.js";import"./chunk-F7FFIUOV.js";import"./chunk-CYMSMVVZ.js";import{$b as d,Aa as O,Ab as De,Ba as j,Cc as F,D as _e,Dc as Se,E as A,Ea as f,Eb as N,Ga as te,Ia as z,J as ge,K as we,Ka as L,L as J,La as Ce,Qc as B,Sb as re,Tb as y,Ub as C,Vb as ke,Xb as ie,Y as X,Yb as ae,Zb as oe,_ as h,_b as s,_c as Me,ac as se,e as w,hc as T,ia as ve,ib as b,jd as W,ka as Y,lc as R,ma as a,nb as ne,nc as m,oc as x,pc as p,qb as xe,qc as de,rc as ce,sa as I,sc as D,t as K,ta as E,tc as k,wa as ee,xa as be,ya as ye,yc as Q,zb as _,zc as u}from"./chunk-WLT34MY4.js";import{a as V,b as U}from"./chunk-EQDQRRRY.js";var Z=["*"],et=["content"],tt=[[["mat-drawer"]],[["mat-drawer-content"]],"*"],nt=["mat-drawer","mat-drawer-content","*"];function rt(r,c){if(r&1){let e=T();s(0,"div",1),R("click",function(){I(e);let n=m();return E(n._onBackdropClicked())}),d()}if(r&2){let e=m();u("mat-drawer-shown",e._isShowingBackdrop())}}function it(r,c){r&1&&(s(0,"mat-drawer-content"),p(1,2),d())}var at=[[["mat-sidenav"]],[["mat-sidenav-content"]],"*"],ot=["mat-sidenav","mat-sidenav-content","*"];function st(r,c){if(r&1){let e=T();s(0,"div",1),R("click",function(){I(e);let n=m();return E(n._onBackdropClicked())}),d()}if(r&2){let e=m();u("mat-drawer-shown",e._isShowingBackdrop())}}function dt(r,c){r&1&&(s(0,"mat-sidenav-content"),p(1,2),d())}var ct=`.mat-drawer-container {
  position: relative;
  z-index: 1;
  color: var(--mat-sidenav-content-text-color, var(--mat-sys-on-background));
  background-color: var(--mat-sidenav-content-background-color, var(--mat-sys-background));
  box-sizing: border-box;
  display: block;
  overflow: hidden;
}
.mat-drawer-container[fullscreen] {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
}
.mat-drawer-container[fullscreen].mat-drawer-container-has-open {
  overflow: hidden;
}
.mat-drawer-container.mat-drawer-container-explicit-backdrop .mat-drawer-side {
  z-index: 3;
}
.mat-drawer-container.ng-animate-disabled .mat-drawer-backdrop,
.mat-drawer-container.ng-animate-disabled .mat-drawer-content, .ng-animate-disabled .mat-drawer-container .mat-drawer-backdrop,
.ng-animate-disabled .mat-drawer-container .mat-drawer-content {
  transition: none;
}

.mat-drawer-backdrop {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  display: block;
  z-index: 3;
  visibility: hidden;
}
.mat-drawer-backdrop.mat-drawer-shown {
  visibility: visible;
  background-color: var(--mat-sidenav-scrim-color, color-mix(in srgb, var(--mat-sys-neutral-variant20) 40%, transparent));
}
.mat-drawer-transition .mat-drawer-backdrop {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: background-color, visibility;
}
@media (forced-colors: active) {
  .mat-drawer-backdrop {
    opacity: 0.5;
  }
}

.mat-drawer-content {
  position: relative;
  z-index: 1;
  display: block;
  height: 100%;
  overflow: auto;
}
.mat-drawer-content.mat-drawer-content-hidden {
  opacity: 0;
}
.mat-drawer-transition .mat-drawer-content {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: transform, margin-left, margin-right;
}

.mat-drawer {
  position: relative;
  z-index: 4;
  color: var(--mat-sidenav-container-text-color, var(--mat-sys-on-surface-variant));
  box-shadow: var(--mat-sidenav-container-elevation-shadow, none);
  background-color: var(--mat-sidenav-container-background-color, var(--mat-sys-surface));
  border-top-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  width: var(--mat-sidenav-container-width, 360px);
  display: block;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  outline: 0;
  box-sizing: border-box;
  overflow-y: auto;
  transform: translate3d(-100%, 0, 0);
}
@media (forced-colors: active) {
  .mat-drawer, [dir=rtl] .mat-drawer.mat-drawer-end {
    border-right: solid 1px currentColor;
  }
}
@media (forced-colors: active) {
  [dir=rtl] .mat-drawer, .mat-drawer.mat-drawer-end {
    border-left: solid 1px currentColor;
    border-right: none;
  }
}
.mat-drawer.mat-drawer-side {
  z-index: 2;
}
.mat-drawer.mat-drawer-end {
  right: 0;
  transform: translate3d(100%, 0, 0);
  border-top-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
[dir=rtl] .mat-drawer {
  border-top-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  transform: translate3d(100%, 0, 0);
}
[dir=rtl] .mat-drawer.mat-drawer-end {
  border-top-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  left: 0;
  right: auto;
  transform: translate3d(-100%, 0, 0);
}
.mat-drawer-transition .mat-drawer {
  transition: transform 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) {
  visibility: hidden;
  box-shadow: none;
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) .mat-drawer-inner-container {
  display: none;
}
.mat-drawer.mat-drawer-opened.mat-drawer-opened {
  transform: none;
}

.mat-drawer-side {
  box-shadow: none;
  border-right-color: var(--mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
}
.mat-drawer-side.mat-drawer-end {
  border-left-color: var(--mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side {
  border-left-color: var(--mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side.mat-drawer-end {
  border-right-color: var(--mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
  border-left: none;
}

.mat-drawer-inner-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.mat-sidenav-fixed {
  position: fixed;
}
`;var lt=new Y("MAT_DRAWER_DEFAULT_AUTOSIZE",{providedIn:"root",factory:()=>!1}),ue=new Y("MAT_DRAWER_CONTAINER"),G=(()=>{class r extends P{_platform=a(H);_changeDetectorRef=a(W);_container=a(he);constructor(){let e=a(L),t=a(Pe),n=a(j);super(e,t,n)}ngAfterContentInit(){this._container._contentMarginChanges.subscribe(()=>{this._changeDetectorRef.markForCheck()})}_shouldBeHidden(){if(this._platform.isBrowser)return!1;let{start:e,end:t}=this._container;return e!=null&&e.mode!=="over"&&e.opened||t!=null&&t.mode!=="over"&&t.opened}static \u0275fac=function(t){return new(t||r)};static \u0275cmp=_({type:r,selectors:[["mat-drawer-content"]],hostAttrs:[1,"mat-drawer-content"],hostVars:6,hostBindings:function(t,n){t&2&&(Q("margin-left",n._container._contentMargins.left,"px")("margin-right",n._container._contentMargins.right,"px"),u("mat-drawer-content-hidden",n._shouldBeHidden()))},features:[B([{provide:P,useExisting:r}]),N],ngContentSelectors:Z,decls:1,vars:0,template:function(t,n){t&1&&(x(),p(0))},encapsulation:2,changeDetection:0})}return r})(),pe=(()=>{class r{_elementRef=a(L);_focusTrapFactory=a(Te);_focusMonitor=a(Ie);_platform=a(H);_ngZone=a(j);_renderer=a(xe);_interactivityChecker=a(Ee);_doc=a(be);_container=a(ue,{optional:!0});_focusTrap=null;_elementFocusedBeforeDrawerWasOpened=null;_eventCleanups;_isAttached=!1;_anchor=null;get position(){return this._position}set position(e){e=e==="end"?"end":"start",e!==this._position&&(this._isAttached&&this._updatePositionInParent(e),this._position=e,this.onPositionChanged.emit())}_position="start";get mode(){return this._mode}set mode(e){this._mode=e,this._updateFocusTrapState(),this._modeChanged.next()}_mode="over";get disableClose(){return this._disableClose}set disableClose(e){this._disableClose=S(e)}_disableClose=!1;get autoFocus(){let e=this._autoFocus;return e??(this.mode==="side"?"dialog":"first-tabbable")}set autoFocus(e){(e==="true"||e==="false"||e==null)&&(e=S(e)),this._autoFocus=e}_autoFocus;get opened(){return this._opened()}set opened(e){this.toggle(S(e))}_opened=f(!1);_openedVia=null;_animationStarted=new w;_animationEnd=new w;openedChange=new O(!0);_openedStream=this.openedChange.pipe(A(e=>e),K(()=>{}));openedStart=this._animationStarted.pipe(A(()=>this.opened),J(void 0));_closedStream=this.openedChange.pipe(A(e=>!e),K(()=>{}));closedStart=this._animationStarted.pipe(A(()=>!this.opened),J(void 0));_destroyed=new w;onPositionChanged=new O;_content;_modeChanged=new w;_injector=a(ee);_changeDetectorRef=a(W);constructor(){this.openedChange.pipe(h(this._destroyed)).subscribe(e=>{e?(this._elementFocusedBeforeDrawerWasOpened=this._doc.activeElement,this._takeFocus()):this._isFocusWithinDrawer()&&this._restoreFocus(this._openedVia||"program")}),this._eventCleanups=this._ngZone.runOutsideAngular(()=>{let e=this._renderer,t=this._elementRef.nativeElement;return[e.listen(t,"keydown",n=>{n.keyCode===27&&!this.disableClose&&!Re(n)&&this._ngZone.run(()=>{this.close(),n.stopPropagation(),n.preventDefault()})}),e.listen(t,"transitionend",this._handleTransitionEvent),e.listen(t,"transitioncancel",this._handleTransitionEvent)]}),this._animationEnd.subscribe(()=>{this.openedChange.emit(this.opened)})}_forceFocus(e,t){this._interactivityChecker.isFocusable(e)||(e.tabIndex=-1,this._ngZone.runOutsideAngular(()=>{let n=()=>{i(),o(),e.removeAttribute("tabindex")},i=this._renderer.listen(e,"blur",n),o=this._renderer.listen(e,"mousedown",n)})),e.focus(t)}_focusByCssSelector(e,t){let n=this._elementRef.nativeElement.querySelector(e);n&&this._forceFocus(n,t)}_takeFocus(){if(!this._focusTrap)return;let e=this._elementRef.nativeElement;switch(this.autoFocus){case!1:case"dialog":return;case!0:case"first-tabbable":ne(()=>{!this._focusTrap.focusInitialElement()&&typeof e.focus=="function"&&e.focus()},{injector:this._injector});break;case"first-heading":this._focusByCssSelector('h1, h2, h3, h4, h5, h6, [role="heading"]');break;default:this._focusByCssSelector(this.autoFocus);break}}_restoreFocus(e){this.autoFocus!=="dialog"&&(this._elementFocusedBeforeDrawerWasOpened?this._focusMonitor.focusVia(this._elementFocusedBeforeDrawerWasOpened,e):this._elementRef.nativeElement.blur(),this._elementFocusedBeforeDrawerWasOpened=null)}_isFocusWithinDrawer(){let e=this._doc.activeElement;return!!e&&this._elementRef.nativeElement.contains(e)}ngAfterViewInit(){this._isAttached=!0,this._position==="end"&&this._updatePositionInParent("end"),this._platform.isBrowser&&(this._focusTrap=this._focusTrapFactory.create(this._elementRef.nativeElement),this._updateFocusTrapState())}ngOnDestroy(){this._eventCleanups.forEach(e=>e()),this._focusTrap?.destroy(),this._anchor?.remove(),this._anchor=null,this._animationStarted.complete(),this._animationEnd.complete(),this._modeChanged.complete(),this._destroyed.next(),this._destroyed.complete()}open(e){return this.toggle(!0,e)}close(){return this.toggle(!1)}_closeViaBackdropClick(){return this._setOpen(!1,!0,"mouse")}toggle(e=!this.opened,t){e&&t&&(this._openedVia=t);let n=this._setOpen(e,!e&&this._isFocusWithinDrawer(),this._openedVia||"program");return e||(this._openedVia=null),n}_setOpen(e,t,n){return e===this.opened?Promise.resolve(e?"open":"close"):(this._opened.set(e),this._container?._transitionsEnabled?(this._setIsAnimating(!0),setTimeout(()=>this._animationStarted.next())):setTimeout(()=>{this._animationStarted.next(),this._animationEnd.next()}),this._elementRef.nativeElement.classList.toggle("mat-drawer-opened",e),!e&&t&&this._restoreFocus(n),this._changeDetectorRef.markForCheck(),this._updateFocusTrapState(),new Promise(i=>{this.openedChange.pipe(we(1)).subscribe(o=>i(o?"open":"close"))}))}_setIsAnimating(e){this._elementRef.nativeElement.classList.toggle("mat-drawer-animating",e)}_getWidth(){return this._elementRef.nativeElement.offsetWidth||0}_updateFocusTrapState(){this._focusTrap&&(this._focusTrap.enabled=this.opened&&!!this._container?._isShowingBackdrop())}_updatePositionInParent(e){if(!this._platform.isBrowser)return;let t=this._elementRef.nativeElement,n=t.parentNode;e==="end"?(this._anchor||(this._anchor=this._doc.createComment("mat-drawer-anchor"),n.insertBefore(this._anchor,t)),n.appendChild(t)):this._anchor&&this._anchor.parentNode.insertBefore(t,this._anchor)}_handleTransitionEvent=e=>{let t=this._elementRef.nativeElement;e.target===t&&this._ngZone.run(()=>{e.type==="transitionend"&&this._setIsAnimating(!1),this._animationEnd.next(e)})};static \u0275fac=function(t){return new(t||r)};static \u0275cmp=_({type:r,selectors:[["mat-drawer"]],viewQuery:function(t,n){if(t&1&&ce(et,5),t&2){let i;D(i=k())&&(n._content=i.first)}},hostAttrs:[1,"mat-drawer"],hostVars:12,hostBindings:function(t,n){t&2&&(re("align",null)("tabIndex",n.mode!=="side"?"-1":null),Q("visibility",!n._container&&!n.opened?"hidden":null),u("mat-drawer-end",n.position==="end")("mat-drawer-over",n.mode==="over")("mat-drawer-push",n.mode==="push")("mat-drawer-side",n.mode==="side"))},inputs:{position:"position",mode:"mode",disableClose:"disableClose",autoFocus:"autoFocus",opened:"opened"},outputs:{openedChange:"openedChange",_openedStream:"opened",openedStart:"openedStart",_closedStream:"closed",closedStart:"closedStart",onPositionChanged:"positionChanged"},exportAs:["matDrawer"],ngContentSelectors:Z,decls:3,vars:0,consts:[["content",""],["cdkScrollable","",1,"mat-drawer-inner-container"]],template:function(t,n){t&1&&(x(),s(0,"div",1,0),p(2),d())},dependencies:[P],encapsulation:2,changeDetection:0})}return r})(),he=(()=>{class r{_dir=a(Fe,{optional:!0});_element=a(L);_ngZone=a(j);_changeDetectorRef=a(W);_animationDisabled=Ne();_transitionsEnabled=!1;_allDrawers;_drawers=new Ce;_content;_userContent;get start(){return this._start}get end(){return this._end}get autosize(){return this._autosize}set autosize(e){this._autosize=S(e)}_autosize=a(lt);get hasBackdrop(){return this._drawerHasBackdrop(this._start)||this._drawerHasBackdrop(this._end)}set hasBackdrop(e){this._backdropOverride=e==null?null:S(e)}_backdropOverride=null;backdropClick=new O;_start=null;_end=null;_left=null;_right=null;_destroyed=new w;_doCheckSubject=new w;_contentMargins={left:null,right:null};_contentMarginChanges=new w;get scrollable(){return this._userContent||this._content}_injector=a(ee);constructor(){let e=a(H),t=a(Ae);this._dir?.change.pipe(h(this._destroyed)).subscribe(()=>{this._validateDrawers(),this.updateContentMargins()}),t.change().pipe(h(this._destroyed)).subscribe(()=>this.updateContentMargins()),!this._animationDisabled&&e.isBrowser&&this._ngZone.runOutsideAngular(()=>{setTimeout(()=>{this._element.nativeElement.classList.add("mat-drawer-transition"),this._transitionsEnabled=!0},200)})}ngAfterContentInit(){this._allDrawers.changes.pipe(X(this._allDrawers),h(this._destroyed)).subscribe(e=>{this._drawers.reset(e.filter(t=>!t._container||t._container===this)),this._drawers.notifyOnChanges()}),this._drawers.changes.pipe(X(null)).subscribe(()=>{this._validateDrawers(),this._drawers.forEach(e=>{this._watchDrawerToggle(e),this._watchDrawerPosition(e),this._watchDrawerMode(e)}),(!this._drawers.length||this._isDrawerOpen(this._start)||this._isDrawerOpen(this._end))&&this.updateContentMargins(),this._changeDetectorRef.markForCheck()}),this._ngZone.runOutsideAngular(()=>{this._doCheckSubject.pipe(ge(10),h(this._destroyed)).subscribe(()=>this.updateContentMargins())})}ngOnDestroy(){this._contentMarginChanges.complete(),this._doCheckSubject.complete(),this._drawers.destroy(),this._destroyed.next(),this._destroyed.complete()}open(){this._drawers.forEach(e=>e.open())}close(){this._drawers.forEach(e=>e.close())}updateContentMargins(){let e=0,t=0;if(this._left&&this._left.opened){if(this._left.mode=="side")e+=this._left._getWidth();else if(this._left.mode=="push"){let n=this._left._getWidth();e+=n,t-=n}}if(this._right&&this._right.opened){if(this._right.mode=="side")t+=this._right._getWidth();else if(this._right.mode=="push"){let n=this._right._getWidth();t+=n,e-=n}}e=e||null,t=t||null,(e!==this._contentMargins.left||t!==this._contentMargins.right)&&(this._contentMargins={left:e,right:t},this._ngZone.run(()=>this._contentMarginChanges.next(this._contentMargins)))}ngDoCheck(){this._autosize&&this._isPushed()&&this._ngZone.runOutsideAngular(()=>this._doCheckSubject.next())}_watchDrawerToggle(e){e._animationStarted.pipe(h(this._drawers.changes)).subscribe(()=>{this.updateContentMargins(),this._changeDetectorRef.markForCheck()}),e.mode!=="side"&&e.openedChange.pipe(h(this._drawers.changes)).subscribe(()=>this._setContainerClass(e.opened))}_watchDrawerPosition(e){e.onPositionChanged.pipe(h(this._drawers.changes)).subscribe(()=>{ne({read:()=>this._validateDrawers()},{injector:this._injector})})}_watchDrawerMode(e){e._modeChanged.pipe(h(_e(this._drawers.changes,this._destroyed))).subscribe(()=>{this.updateContentMargins(),this._changeDetectorRef.markForCheck()})}_setContainerClass(e){let t=this._element.nativeElement.classList,n="mat-drawer-container-has-open";e?t.add(n):t.remove(n)}_validateDrawers(){this._start=this._end=null,this._drawers.forEach(e=>{e.position=="end"?(this._end!=null,this._end=e):(this._start!=null,this._start=e)}),this._right=this._left=null,this._dir&&this._dir.value==="rtl"?(this._left=this._end,this._right=this._start):(this._left=this._start,this._right=this._end)}_isPushed(){return this._isDrawerOpen(this._start)&&this._start.mode!="over"||this._isDrawerOpen(this._end)&&this._end.mode!="over"}_onBackdropClicked(){this.backdropClick.emit(),this._closeModalDrawersViaBackdrop()}_closeModalDrawersViaBackdrop(){[this._start,this._end].filter(e=>e&&!e.disableClose&&this._drawerHasBackdrop(e)).forEach(e=>e._closeViaBackdropClick())}_isShowingBackdrop(){return this._isDrawerOpen(this._start)&&this._drawerHasBackdrop(this._start)||this._isDrawerOpen(this._end)&&this._drawerHasBackdrop(this._end)}_isDrawerOpen(e){return e!=null&&e.opened}_drawerHasBackdrop(e){return this._backdropOverride==null?!!e&&e.mode!=="side":this._backdropOverride}static \u0275fac=function(t){return new(t||r)};static \u0275cmp=_({type:r,selectors:[["mat-drawer-container"]],contentQueries:function(t,n,i){if(t&1&&de(i,G,5)(i,pe,5),t&2){let o;D(o=k())&&(n._content=o.first),D(o=k())&&(n._allDrawers=o)}},viewQuery:function(t,n){if(t&1&&ce(G,5),t&2){let i;D(i=k())&&(n._userContent=i.first)}},hostAttrs:[1,"mat-drawer-container"],hostVars:2,hostBindings:function(t,n){t&2&&u("mat-drawer-container-explicit-backdrop",n._backdropOverride)},inputs:{autosize:"autosize",hasBackdrop:"hasBackdrop"},outputs:{backdropClick:"backdropClick"},exportAs:["matDrawerContainer"],features:[B([{provide:ue,useExisting:r}])],ngContentSelectors:nt,decls:4,vars:2,consts:[[1,"mat-drawer-backdrop",3,"mat-drawer-shown"],[1,"mat-drawer-backdrop",3,"click"]],template:function(t,n){t&1&&(x(tt),y(0,rt,1,2,"div",0),p(1),p(2,1),y(3,it,2,0,"mat-drawer-content")),t&2&&(C(n.hasBackdrop?0:-1),b(3),C(n._content?-1:3))},dependencies:[G],styles:[`.mat-drawer-container {
  position: relative;
  z-index: 1;
  color: var(--mat-sidenav-content-text-color, var(--mat-sys-on-background));
  background-color: var(--mat-sidenav-content-background-color, var(--mat-sys-background));
  box-sizing: border-box;
  display: block;
  overflow: hidden;
}
.mat-drawer-container[fullscreen] {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
}
.mat-drawer-container[fullscreen].mat-drawer-container-has-open {
  overflow: hidden;
}
.mat-drawer-container.mat-drawer-container-explicit-backdrop .mat-drawer-side {
  z-index: 3;
}
.mat-drawer-container.ng-animate-disabled .mat-drawer-backdrop,
.mat-drawer-container.ng-animate-disabled .mat-drawer-content, .ng-animate-disabled .mat-drawer-container .mat-drawer-backdrop,
.ng-animate-disabled .mat-drawer-container .mat-drawer-content {
  transition: none;
}

.mat-drawer-backdrop {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  display: block;
  z-index: 3;
  visibility: hidden;
}
.mat-drawer-backdrop.mat-drawer-shown {
  visibility: visible;
  background-color: var(--mat-sidenav-scrim-color, color-mix(in srgb, var(--mat-sys-neutral-variant20) 40%, transparent));
}
.mat-drawer-transition .mat-drawer-backdrop {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: background-color, visibility;
}
@media (forced-colors: active) {
  .mat-drawer-backdrop {
    opacity: 0.5;
  }
}

.mat-drawer-content {
  position: relative;
  z-index: 1;
  display: block;
  height: 100%;
  overflow: auto;
}
.mat-drawer-content.mat-drawer-content-hidden {
  opacity: 0;
}
.mat-drawer-transition .mat-drawer-content {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.25, 0.8, 0.25, 1);
  transition-property: transform, margin-left, margin-right;
}

.mat-drawer {
  position: relative;
  z-index: 4;
  color: var(--mat-sidenav-container-text-color, var(--mat-sys-on-surface-variant));
  box-shadow: var(--mat-sidenav-container-elevation-shadow, none);
  background-color: var(--mat-sidenav-container-background-color, var(--mat-sys-surface));
  border-top-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  width: var(--mat-sidenav-container-width, 360px);
  display: block;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  outline: 0;
  box-sizing: border-box;
  overflow-y: auto;
  transform: translate3d(-100%, 0, 0);
}
@media (forced-colors: active) {
  .mat-drawer, [dir=rtl] .mat-drawer.mat-drawer-end {
    border-right: solid 1px currentColor;
  }
}
@media (forced-colors: active) {
  [dir=rtl] .mat-drawer, .mat-drawer.mat-drawer-end {
    border-left: solid 1px currentColor;
    border-right: none;
  }
}
.mat-drawer.mat-drawer-side {
  z-index: 2;
}
.mat-drawer.mat-drawer-end {
  right: 0;
  transform: translate3d(100%, 0, 0);
  border-top-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
[dir=rtl] .mat-drawer {
  border-top-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-left-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  transform: translate3d(100%, 0, 0);
}
[dir=rtl] .mat-drawer.mat-drawer-end {
  border-top-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-bottom-right-radius: var(--mat-sidenav-container-shape, var(--mat-sys-corner-large));
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  left: 0;
  right: auto;
  transform: translate3d(-100%, 0, 0);
}
.mat-drawer-transition .mat-drawer {
  transition: transform 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) {
  visibility: hidden;
  box-shadow: none;
}
.mat-drawer:not(.mat-drawer-opened):not(.mat-drawer-animating) .mat-drawer-inner-container {
  display: none;
}
.mat-drawer.mat-drawer-opened.mat-drawer-opened {
  transform: none;
}

.mat-drawer-side {
  box-shadow: none;
  border-right-color: var(--mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
}
.mat-drawer-side.mat-drawer-end {
  border-left-color: var(--mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side {
  border-left-color: var(--mat-sidenav-container-divider-color, transparent);
  border-left-width: 1px;
  border-left-style: solid;
  border-right: none;
}
[dir=rtl] .mat-drawer-side.mat-drawer-end {
  border-right-color: var(--mat-sidenav-container-divider-color, transparent);
  border-right-width: 1px;
  border-right-style: solid;
  border-left: none;
}

.mat-drawer-inner-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.mat-sidenav-fixed {
  position: fixed;
}
`],encapsulation:2,changeDetection:0})}return r})(),$=(()=>{class r extends G{static \u0275fac=(()=>{let e;return function(n){return(e||(e=z(r)))(n||r)}})();static \u0275cmp=_({type:r,selectors:[["mat-sidenav-content"]],hostAttrs:[1,"mat-drawer-content","mat-sidenav-content"],features:[B([{provide:P,useExisting:r}]),N],ngContentSelectors:Z,decls:1,vars:0,template:function(t,n){t&1&&(x(),p(0))},encapsulation:2,changeDetection:0})}return r})(),fe=(()=>{class r extends pe{get fixedInViewport(){return this._fixedInViewport}set fixedInViewport(e){this._fixedInViewport=S(e)}_fixedInViewport=!1;get fixedTopGap(){return this._fixedTopGap}set fixedTopGap(e){this._fixedTopGap=le(e)}_fixedTopGap=0;get fixedBottomGap(){return this._fixedBottomGap}set fixedBottomGap(e){this._fixedBottomGap=le(e)}_fixedBottomGap=0;static \u0275fac=(()=>{let e;return function(n){return(e||(e=z(r)))(n||r)}})();static \u0275cmp=_({type:r,selectors:[["mat-sidenav"]],hostAttrs:[1,"mat-drawer","mat-sidenav"],hostVars:16,hostBindings:function(t,n){t&2&&(re("tabIndex",n.mode!=="side"?"-1":null)("align",null),Q("top",n.fixedInViewport?n.fixedTopGap:null,"px")("bottom",n.fixedInViewport?n.fixedBottomGap:null,"px"),u("mat-drawer-end",n.position==="end")("mat-drawer-over",n.mode==="over")("mat-drawer-push",n.mode==="push")("mat-drawer-side",n.mode==="side")("mat-sidenav-fixed",n.fixedInViewport))},inputs:{fixedInViewport:"fixedInViewport",fixedTopGap:"fixedTopGap",fixedBottomGap:"fixedBottomGap"},exportAs:["matSidenav"],features:[B([{provide:pe,useExisting:r}]),N],ngContentSelectors:Z,decls:3,vars:0,consts:[["content",""],["cdkScrollable","",1,"mat-drawer-inner-container"]],template:function(t,n){t&1&&(x(),s(0,"div",1,0),p(2),d())},dependencies:[P],encapsulation:2,changeDetection:0})}return r})(),Ke=(()=>{class r extends he{_allDrawers=void 0;_content=void 0;static \u0275fac=(()=>{let e;return function(n){return(e||(e=z(r)))(n||r)}})();static \u0275cmp=_({type:r,selectors:[["mat-sidenav-container"]],contentQueries:function(t,n,i){if(t&1&&de(i,$,5)(i,fe,5),t&2){let o;D(o=k())&&(n._content=o.first),D(o=k())&&(n._allDrawers=o)}},hostAttrs:[1,"mat-drawer-container","mat-sidenav-container"],hostVars:2,hostBindings:function(t,n){t&2&&u("mat-drawer-container-explicit-backdrop",n._backdropOverride)},exportAs:["matSidenavContainer"],features:[B([{provide:ue,useExisting:r},{provide:he,useExisting:r}]),N],ngContentSelectors:ot,decls:4,vars:2,consts:[[1,"mat-drawer-backdrop",3,"mat-drawer-shown"],[1,"mat-drawer-backdrop",3,"click"]],template:function(t,n){t&1&&(x(at),y(0,st,1,2,"div",0),p(1),p(2,1),y(3,dt,2,0,"mat-sidenav-content")),t&2&&(C(n.hasBackdrop?0:-1),b(3),C(n._content?-1:3))},dependencies:[$],styles:[ct],encapsulation:2,changeDetection:0})}return r})(),Je=(()=>{class r{static \u0275fac=function(t){return new(t||r)};static \u0275mod=De({type:r});static \u0275inj=ve({imports:[me,Be,me]})}return r})();var pt=(r,c)=>c.id;function ht(r,c){if(r&1){let e=T();s(0,"button",9),R("click",function(){let n=I(e).$implicit,i=m();return E(i.displayDashboards(n.displayId))}),F(1),d()}if(r&2){let e=c.$implicit,t=m();u("selected",t.selectedDisplayButtonId()===e.displayId),b(),Se(e.displayName)}}function ut(r,c){r&1&&(s(0,"button",5)(1,"i"),F(2,'"No Remote"'),d()())}function ft(r,c){r&1&&(s(0,"div",7),se(1,"mat-progress-spinner",10),d())}function _t(r,c){if(r&1){let e=T();s(0,"tile-large-icon",12,0),R("click",function(){let n=I(e).$index,i=m(2);return E(i.setActiveScreen(n))}),d()}if(r&2){let e=c.$implicit,t=c.$index,n=m(2);oe("active",n.activeScreenIdx()===t)("svgIcon",e.icon)("iconSize",72)("label",e.name)}}function gt(r,c){if(r&1&&ie(0,_t,2,4,"tile-large-icon",11,pt),r&2){let e=m();ae(e.screens())}}function wt(r,c){r&1&&(s(0,"div",8)(1,"mat-icon",13),F(2,"cast"),d(),s(3,"div",14)(4,"p"),F(5,"Select an available remote Skip in the menu."),d(),s(6,"p"),F(7,"To allow remote control of a dashboard, on that Skip device open Settings, then enable Remote Control on the Display tab."),d()()())}var en=(()=>{class r{COMMAND_REQUEST_ACTIVE_SCREEN_PATH="self.skip.remote.requestActiveScreen";_settings=a(ze);_data=a(Le);_requests=a(qe);_destroyRef=a(ye);pageTitle="Remote Control";appID=this._settings.SkipUUID;displayId=f(null);selectedDisplayButtonId=f(null);screensLoading=f(!1);displaysMap=f({});selectedDisplaySub=null;selectedScreenIndexSub=null;selectedDisplayRelease=null;selectedScreenIndexRelease=null;displays=Me(()=>Object.values(this.displaysMap()).filter(t=>t.displayId!==this.appID).sort((t,n)=>{let i=(t.displayName??"").toLowerCase(),o=(n.displayName??"").toLowerCase();return i&&o?i.localeCompare(o):i?-1:o?1:t.displayId.localeCompare(n.displayId)}));screens=f([]);activeScreenIdx=f(null);constructor(){this._data.subscribePathTree("self.displays.*").pipe(q(this._destroyRef)).subscribe(({path:e,update:t})=>{this.updateDisplayCatalog(e,t.data.value)}),te(()=>{let e=this.displays(),t=this.selectedDisplayButtonId();if(!e.length){this.displayDashboards(null);return}(!t||!e.some(n=>n.displayId===t))&&this.displayDashboards(e[0].displayId)}),te(()=>{this.rebindSelectedDisplaySubscriptions(this.displayId())})}updateDisplayCatalog(e,t){let n=this.extractDisplayId(e);if(!n||n===this.appID)return;let i=`self.displays.${n}`;this.displaysMap.update(o=>{let v=V({},o);if(e===i&&(t===null||typeof t>"u"))return delete v[n],v;let g=(v[n]??{displayId:n,displayName:null}).displayName;if(e===i&&t&&typeof t=="object"){let M=t;typeof M.displayName=="string"?g=M.displayName:M.displayName===null&&(g=null)}return v[n]={displayId:n,displayName:g},v})}rebindSelectedDisplaySubscriptions(e){if(this.selectedDisplaySub?.unsubscribe(),this.selectedDisplaySub=null,this.selectedScreenIndexSub?.unsubscribe(),this.selectedScreenIndexSub=null,this.selectedDisplayRelease?.(),this.selectedDisplayRelease=null,this.selectedScreenIndexRelease?.(),this.selectedScreenIndexRelease=null,!e){this.screensLoading.set(!1),this.screens.set([]),this.activeScreenIdx.set(null);return}this.screensLoading.set(!0);let t=this._data.acquirePath(`self.displays.${e}`,"default");this.selectedDisplayRelease=t.release,this.selectedDisplaySub=t.data$.pipe(q(this._destroyRef)).subscribe(i=>{this.screensLoading.set(!1);let o=i.data.value,v=Array.isArray(o?.screens)?o.screens.filter(l=>!!l&&typeof l=="object"&&typeof l.id=="string"&&typeof l.name=="string"&&typeof l.icon=="string"):[];this.screens.set(v),o&&Object.prototype.hasOwnProperty.call(o,"displayName")&&this.displaysMap.update(l=>{let g=l[e];if(!g)return l;let M=typeof o.displayName=="string"?o.displayName:o.displayName===null?null:g.displayName;return M===g.displayName?l:U(V({},l),{[e]:U(V({},g),{displayName:M})})})});let n=this._data.acquirePath(`self.displays.${e}.screenIndex`,"default");this.selectedScreenIndexRelease=n.release,this.selectedScreenIndexSub=n.data$.pipe(q(this._destroyRef)).subscribe(i=>{let o=i.data.value;this.activeScreenIdx.set(typeof o=="number"?o:null)})}extractDisplayId(e){return e.match(/^self\.displays\.([^.]+)(?:\.|$)/)?.[1]??null}displayDashboards(e){this.displayId.set(e),this.selectedDisplayButtonId.set(e)}setActiveScreen(e){let t=this.activeScreenIdx(),n=this.displayId();if(!n)return;this.activeScreenIdx.set(e),this._requests.putRequest(this.COMMAND_REQUEST_ACTIVE_SCREEN_PATH,{displayId:n,screenIdx:e},this.appID)||(console.error("Failed to set active screen: request was not accepted"),this.activeScreenIdx.set(t))}ngOnDestroy(){this.selectedDisplayRelease?.(),this.selectedScreenIndexRelease?.()}static \u0275fac=function(t){return new(t||r)};static \u0275cmp=_({type:r,selectors:[["remote-control"]],decls:11,vars:3,consts:[["tile",""],["svgIconId","remote-control",3,"pageTitle"],[1,"sidenav-remote-control-container"],["mode","side","opened",""],["mat-list-item","","tabindex","0",3,"selected"],["mat-list-item","","tabindex","0","disabled","true",2,"text-align","center"],[1,"sidenav-remote-control-content"],["aria-label","Loading screens",1,"loading-container"],["role","status","aria-live","polite",1,"empty-state-msg"],["mat-list-item","","tabindex","0",3,"click"],["mode","indeterminate","diameter","64","strokeWidth","5"],[3,"active","svgIcon","iconSize","label"],[3,"click","active","svgIcon","iconSize","label"],["aria-hidden","true","color","primary",1,"empty-state-icon"],[1,"copy"]],template:function(t,n){t&1&&(se(0,"page-header",1),s(1,"mat-sidenav-container",2)(2,"mat-sidenav",3)(3,"mat-action-list"),ie(4,ht,2,3,"button",4,ke,!1,ut,3,0,"button",5),d()(),s(7,"mat-sidenav-content",6),y(8,ft,2,0,"div",7)(9,gt,2,0)(10,wt,8,0,"div",8),d()()),t&2&&(oe("pageTitle",n.pageTitle),b(4),ae(n.displays()),b(4),C(n.screensLoading()?8:n.screens().length?9:10))},dependencies:[Ze,Je,fe,Ke,$,$e,He,Ge,Ve,We,Qe,Ue,je,Oe],styles:[".sidenav-remote-control-container[_ngcontent-%COMP%]{height:calc(100% - 87px);width:calc(100% - 48px);margin:0 24px 24px;border:1px solid var(--mat-sys-outline-variant)}mat-sidenav[_ngcontent-%COMP%]{width:150px;--mat-sidenav-container-shape: square}.selected[_ngcontent-%COMP%]{background-color:var(--mat-sys-inverse-on-surface)}.loading-container[_ngcontent-%COMP%]{min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px}.sidenav-remote-control-content[_ngcontent-%COMP%]{display:flex;flex-direction:row;flex-wrap:wrap;align-content:flex-start;height:100%;width:100%;padding:5px;gap:5px;overflow-y:auto;scrollbar-width:none;overflow-x:hidden;scroll-behavior:smooth;flex:1 1 auto;min-height:0}tile-large-icon[_ngcontent-%COMP%]{width:190px}.empty-state-msg[_ngcontent-%COMP%]{display:flex;flex-direction:column;flex-wrap:nowrap;align-items:center;justify-content:center;height:100%;width:calc(100% - 150px);min-height:70vh;padding:2rem;text-align:center;color:var(--mat-sys-outline-variant);font-style:italic}.empty-state-icon[_ngcontent-%COMP%]{font-size:4rem;width:4rem;height:4rem;color:var(--mat-sys-outline-variant);margin-bottom:1rem}"]})}return r})();export{en as RemoteControlComponent};
