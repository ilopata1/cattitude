import{a as Uo,b as Wo,c as $o,d as qo,f as Ho,g as jo,h as Ko}from"./chunk-75QCJ722.js";import{c as Ct,d as dt,f as Po,g as yt,h as xt,i as kt,j as qt,k as Xe,l as wn,m as Sn,n as Mn}from"./chunk-ZVM67GQQ.js";import{a as hn,b as fn,c as gn,d as _n,e as Lo,f as ee,g as bn,h as vn,i as Zt,j as yi,k as Zo,n as Xo,o as Jo,p as er}from"./chunk-RRGGMH65.js";import{a as et,b as ct}from"./chunk-S3L7IWZZ.js";import{a as Bo,b as zo}from"./chunk-RN3JTF4B.js";import{a as Ro,b as No}from"./chunk-UKNBRRH6.js";import{a as Qo}from"./chunk-O4VQ6WOT.js";import{a as Yo}from"./chunk-MLLO564J.js";import{a as kn}from"./chunk-6QFUL73V.js";import{b as Go}from"./chunk-NLI4NHKU.js";import{a as xi}from"./chunk-OCDMBLB7.js";import{A as Yt,B as $e,C as J,a as Ht,b as fe,c as mn,d as z,e as pn,f as Q,g as ce,h as Oo,i as Ve,j as jt,k as gi,l as L,m as un,n as _i,o as wt,p as bi,q as ft,r as Je,s as Kt,t as vi,u as Re,v as U,w as Ci,x as Qt,y as Me,z as Fo}from"./chunk-UVUM4TWZ.js";import{b as Tn,c as En}from"./chunk-S2EGLYEQ.js";import{b as Vo}from"./chunk-LKWOOPTM.js";import{f as Do}from"./chunk-MH5BCD5P.js";import{a as oo,f as Eo,g as Io,l as fi,m as ia,n as Ao}from"./chunk-JMHC7EK6.js";import{b as Ut}from"./chunk-HNE4YS45.js";import{b as Co,c as ui,d as rn,f as ln,i as yo,j as Xn,m as sn,n as xo,q as ko,s as wo,t as So,v as Jn,w as ea,x as dn}from"./chunk-3NOF2XKB.js";import{b as K,c as de}from"./chunk-FV475IDC.js";import{B as ta,D as Ie,E as hi,I as Pt,J as $t,K as le,L as Mo,M as Se,O as To,P as se,d as ro,e as an,g as Zn,h as Vi,i as lo,j as po,k as uo,l as ho,n as fo,o as go,p as vt,q as on,r as _o,s as ye,t as Gi,u as si,v as bo}from"./chunk-BZCKGPOI.js";import{a as st,b as so,i as Dt,j as Fe}from"./chunk-BAZECE27.js";import{a as ht,b as co,d as mo,e as vo}from"./chunk-QGZBTYGQ.js";import{f as Za,g as Xa,i as Ja,j as nn,k as Wt,l as eo,m as to,n as io}from"./chunk-GN3JT7IS.js";import{a as xn}from"./chunk-VP2N3BSC.js";import{b as tt}from"./chunk-NRHWHDML.js";import{a as Cn,b as yn}from"./chunk-VQODOO6P.js";import{d as cn}from"./chunk-JPULYVUU.js";import{a as q,c as Ni}from"./chunk-AHJJRFXE.js";import{k as no}from"./chunk-F7FFIUOV.js";import{a as Li,b as ao}from"./chunk-CYMSMVVZ.js";import{$b as a,Aa as j,Ab as we,Ac as ai,B as Ii,Ba as ae,Bb as pe,Bc as Ue,C as Ia,Cb as za,Cc as l,D as De,Dc as v,E as rt,Ea as T,Eb as Ai,Ec as B,Fb as ze,Fc as We,Ga as Gt,Gb as Zi,Ha as Ge,I as Aa,Ia as Qi,Ib as Ua,Ic as oi,J as Lt,Jc as ri,K as ji,Ka as X,Kc as li,La as Va,Lc as Yn,Mc as Di,N as Da,Nc as Pi,Oc as It,P as Pa,Qc as ve,Rb as Wa,Rc as Oi,S as Oa,Sb as $,Sc as Ce,Tb as h,Tc as Le,Ub as f,Uc as Fi,Vb as oe,Vc as ja,W as Fa,Wb as _e,X as Ra,Xb as I,Y as Ke,Yb as A,Z as Et,Zb as g,Zc as Ka,_ as Qe,_b as o,_c as ue,a as nt,aa as Ki,ac as b,ba as Hn,bc as Xi,cc as Ji,cd as At,d as ni,dc as Kn,dd as bt,e as me,eb as Ga,ec as en,ed as S,fc as tn,fd as Ri,g as $n,ga as Vt,gc as $a,gd as Qa,ha as xe,hc as P,ia as ke,ib as d,ic as ut,j as ci,jd as Oe,ka as H,l as Ei,lc as C,ma as m,md as D,nb as Bt,nc as u,nd as Ze,ob as pi,oc as Ne,od as Ya,pb as Ba,pc as re,q as qn,qa as Na,qb as Be,qc as lt,rc as Pe,sa as y,sc as O,t as at,ta as x,tc as F,u as Ea,ua as mi,ub as Yi,uc as qa,va as La,vc as Ha,wa as _t,wc as Qn,xa as jn,xc as Y,y as Hi,ya as be,yc as zt,zb as E,zc as G}from"./chunk-WLT34MY4.js";import{a as R,b as W,f as N}from"./chunk-EQDQRRRY.js";var na=class{_box;_destroyed=new me;_resizeSubject=new me;_resizeObserver;_elementObservables=new Map;constructor(s){this._box=s,typeof ResizeObserver<"u"&&(this._resizeObserver=new ResizeObserver(e=>this._resizeSubject.next(e)))}observe(s){return this._elementObservables.has(s)||this._elementObservables.set(s,new ni(e=>{let t=this._resizeSubject.subscribe(e);return this._resizeObserver?.observe(s,{box:this._box}),()=>{this._resizeObserver?.unobserve(s),t.unsubscribe(),this._elementObservables.delete(s)}}).pipe(rt(e=>e.some(t=>t.target===s)),Fa({bufferSize:1,refCount:!0}),Qe(this._destroyed))),this._elementObservables.get(s)}destroy(){this._destroyed.next(),this._destroyed.complete(),this._resizeSubject.complete(),this._elementObservables.clear()}},In=(()=>{class n{_cleanupErrorListener;_observers=new Map;_ngZone=m(ae);constructor(){typeof ResizeObserver<"u"}ngOnDestroy(){for(let[,e]of this._observers)e.destroy();this._observers.clear(),this._cleanupErrorListener?.()}observe(e,t){let i=t?.box||"content-box";return this._observers.has(i)||this._observers.set(i,new na(i)),this._observers.get(i).observe(e)}static \u0275fac=function(t){return new(t||n)};static \u0275prov=xe({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})();var Ll=["notch"],Vl=["matFormFieldNotchedOutline",""],Gl=["*"],tr=["iconPrefixContainer"],ir=["textPrefixContainer"],nr=["iconSuffixContainer"],ar=["textSuffixContainer"],Bl=["textField"],zl=["*",[["mat-label"]],[["","matPrefix",""],["","matIconPrefix",""]],[["","matTextPrefix",""]],[["","matTextSuffix",""]],[["","matSuffix",""],["","matIconSuffix",""]],[["mat-error"],["","matError",""]],[["mat-hint",3,"align","end"]],[["mat-hint","align","end"]]],Ul=["*","mat-label","[matPrefix], [matIconPrefix]","[matTextPrefix]","[matTextSuffix]","[matSuffix], [matIconSuffix]","mat-error, [matError]","mat-hint:not([align='end'])","mat-hint[align='end']"];function Wl(n,s){n&1&&b(0,"span",21)}function $l(n,s){if(n&1&&(o(0,"label",20),re(1,1),h(2,Wl,1,0,"span",21),a()),n&2){let e=u(2);g("floating",e._shouldLabelFloat())("monitorResize",e._hasOutline())("id",e._labelId),$("for",e._control.disableAutomaticLabeling?null:e._control.id),d(2),f(!e.hideRequiredMarker&&e._control.required?2:-1)}}function ql(n,s){if(n&1&&h(0,$l,3,5,"label",20),n&2){let e=u();f(e._hasFloatingLabel()?0:-1)}}function Hl(n,s){n&1&&b(0,"div",7)}function jl(n,s){}function Kl(n,s){if(n&1&&ze(0,jl,0,0,"ng-template",13),n&2){u(2);let e=Y(1);g("ngTemplateOutlet",e)}}function Ql(n,s){if(n&1&&(o(0,"div",9),h(1,Kl,1,1,null,13),a()),n&2){let e=u();g("matFormFieldNotchedOutlineOpen",e._shouldLabelFloat()),d(),f(e._forceDisplayInfixLabel()?-1:1)}}function Yl(n,s){n&1&&(o(0,"div",10,2),re(2,2),a())}function Zl(n,s){n&1&&(o(0,"div",11,3),re(2,3),a())}function Xl(n,s){}function Jl(n,s){if(n&1&&ze(0,Xl,0,0,"ng-template",13),n&2){u();let e=Y(1);g("ngTemplateOutlet",e)}}function es(n,s){n&1&&(o(0,"div",14,4),re(2,4),a())}function ts(n,s){n&1&&(o(0,"div",15,5),re(2,5),a())}function is(n,s){n&1&&b(0,"div",16)}function ns(n,s){n&1&&(o(0,"div",18),re(1,6),a())}function as(n,s){if(n&1&&(o(0,"mat-hint",22),l(1),a()),n&2){let e=u(2);g("id",e._hintLabelId),d(),v(e.hintLabel)}}function os(n,s){if(n&1&&(o(0,"div",19),h(1,as,2,2,"mat-hint",22),re(2,7),b(3,"div",23),re(4,8),a()),n&2){let e=u();d(),f(e.hintLabel?1:-1)}}var Z=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,selectors:[["mat-label"]]})}return n})(),aa=new H("MatError"),gt=(()=>{class n{id=m(ye).getId("mat-mdc-error-");constructor(){}static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,selectors:[["mat-error"],["","matError",""]],hostAttrs:[1,"mat-mdc-form-field-error","mat-mdc-form-field-bottom-align"],hostVars:1,hostBindings:function(t,i){t&2&&ut("id",i.id)},inputs:{id:"id"},features:[ve([{provide:aa,useExisting:n}])]})}return n})(),ot=(()=>{class n{align="start";id=m(ye).getId("mat-mdc-hint-");static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,selectors:[["mat-hint"]],hostAttrs:[1,"mat-mdc-form-field-hint","mat-mdc-form-field-bottom-align"],hostVars:4,hostBindings:function(t,i){t&2&&(ut("id",i.id),$("align",null),G("mat-mdc-form-field-hint-end",i.align==="end"))},inputs:{align:"align",id:"id"}})}return n})(),mr=new H("MatPrefix");var oa=new H("MatSuffix"),Ot=(()=>{class n{set _isTextSelector(e){this._isText=!0}_isText=!1;static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,selectors:[["","matSuffix",""],["","matIconSuffix",""],["","matTextSuffix",""]],inputs:{_isTextSelector:[0,"matTextSuffix","_isTextSelector"]},features:[ve([{provide:oa,useExisting:n}])]})}return n})(),pr=new H("FloatingLabelParent"),or=(()=>{class n{_elementRef=m(X);get floating(){return this._floating}set floating(e){this._floating=e,this.monitorResize&&this._handleResize()}_floating=!1;get monitorResize(){return this._monitorResize}set monitorResize(e){this._monitorResize=e,this._monitorResize?this._subscribeToResize():this._resizeSubscription.unsubscribe()}_monitorResize=!1;_resizeObserver=m(In);_ngZone=m(ae);_parent=m(pr);_resizeSubscription=new nt;constructor(){}ngOnDestroy(){this._resizeSubscription.unsubscribe()}getWidth(){return rs(this._elementRef.nativeElement)}get element(){return this._elementRef.nativeElement}_handleResize(){setTimeout(()=>this._parent._handleLabelResized())}_subscribeToResize(){this._resizeSubscription.unsubscribe(),this._ngZone.runOutsideAngular(()=>{this._resizeSubscription=this._resizeObserver.observe(this._elementRef.nativeElement,{box:"border-box"}).subscribe(()=>this._handleResize())})}static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,selectors:[["label","matFormFieldFloatingLabel",""]],hostAttrs:[1,"mdc-floating-label","mat-mdc-floating-label"],hostVars:2,hostBindings:function(t,i){t&2&&G("mdc-floating-label--float-above",i.floating)},inputs:{floating:"floating",monitorResize:"monitorResize"}})}return n})();function rs(n){let s=n;if(s.offsetParent!==null)return s.scrollWidth;let e=s.cloneNode(!0);e.style.setProperty("position","absolute"),e.style.setProperty("transform","translate(-9999px, -9999px)"),document.documentElement.appendChild(e);let t=e.scrollWidth;return e.remove(),t}var rr="mdc-line-ripple--active",An="mdc-line-ripple--deactivating",lr=(()=>{class n{_elementRef=m(X);_cleanupTransitionEnd;constructor(){let e=m(ae),t=m(Be);e.runOutsideAngular(()=>{this._cleanupTransitionEnd=t.listen(this._elementRef.nativeElement,"transitionend",this._handleTransitionEnd)})}activate(){let e=this._elementRef.nativeElement.classList;e.remove(An),e.add(rr)}deactivate(){this._elementRef.nativeElement.classList.add(An)}_handleTransitionEnd=e=>{let t=this._elementRef.nativeElement.classList,i=t.contains(An);e.propertyName==="opacity"&&i&&t.remove(rr,An)};ngOnDestroy(){this._cleanupTransitionEnd()}static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,selectors:[["div","matFormFieldLineRipple",""]],hostAttrs:[1,"mdc-line-ripple"]})}return n})(),sr=(()=>{class n{_elementRef=m(X);_ngZone=m(ae);open=!1;_notch;ngAfterViewInit(){let e=this._elementRef.nativeElement,t=e.querySelector(".mdc-floating-label");t?(e.classList.add("mdc-notched-outline--upgraded"),typeof requestAnimationFrame=="function"&&(t.style.transitionDuration="0s",this._ngZone.runOutsideAngular(()=>{requestAnimationFrame(()=>t.style.transitionDuration="")}))):e.classList.add("mdc-notched-outline--no-label")}_setNotchWidth(e){let t=this._notch.nativeElement;!this.open||!e?t.style.width="":t.style.width=`calc(${e}px * var(--mat-mdc-form-field-floating-label-scale, 0.75) + 9px)`}_setMaxWidth(e){this._notch.nativeElement.style.setProperty("--mat-form-field-notch-max-width",`calc(100% - ${e}px)`)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["div","matFormFieldNotchedOutline",""]],viewQuery:function(t,i){if(t&1&&Pe(Ll,5),t&2){let r;O(r=F())&&(i._notch=r.first)}},hostAttrs:[1,"mdc-notched-outline"],hostVars:2,hostBindings:function(t,i){t&2&&G("mdc-notched-outline--notched",i.open)},inputs:{open:[0,"matFormFieldNotchedOutlineOpen","open"]},attrs:Vl,ngContentSelectors:Gl,decls:5,vars:0,consts:[["notch",""],[1,"mat-mdc-notch-piece","mdc-notched-outline__leading"],[1,"mat-mdc-notch-piece","mdc-notched-outline__notch"],[1,"mat-mdc-notch-piece","mdc-notched-outline__trailing"]],template:function(t,i){t&1&&(Ne(),Kn(0,"div",1),Xi(1,"div",2,0),re(3),Ji(),Kn(4,"div",3))},encapsulation:2,changeDetection:0})}return n})(),ki=(()=>{class n{value=null;stateChanges;id;placeholder;ngControl=null;focused=!1;empty=!1;shouldLabelFloat=!1;required=!1;disabled=!1;errorState=!1;controlType;autofilled;userAriaDescribedBy;disableAutomaticLabeling;describedByIds;static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n})}return n})();var Xt=new H("MatFormField"),ur=new H("MAT_FORM_FIELD_DEFAULT_OPTIONS"),dr="fill",ls="auto",cr="fixed",ss="translateY(-50%)",te=(()=>{class n{_elementRef=m(X);_changeDetectorRef=m(Oe);_platform=m(ht);_idGenerator=m(ye);_ngZone=m(ae);_defaults=m(ur,{optional:!0});_currentDirection;_textField;_iconPrefixContainer;_textPrefixContainer;_iconSuffixContainer;_textSuffixContainer;_floatingLabel;_notchedOutline;_lineRipple;_iconPrefixContainerSignal=Ri("iconPrefixContainer");_textPrefixContainerSignal=Ri("textPrefixContainer");_iconSuffixContainerSignal=Ri("iconSuffixContainer");_textSuffixContainerSignal=Ri("textSuffixContainer");_prefixSuffixContainers=ue(()=>[this._iconPrefixContainerSignal(),this._textPrefixContainerSignal(),this._iconSuffixContainerSignal(),this._textSuffixContainerSignal()].map(e=>e?.nativeElement).filter(e=>e!==void 0));_formFieldControl;_prefixChildren;_suffixChildren;_errorChildren;_hintChildren;_labelChild=Qa(Z);get hideRequiredMarker(){return this._hideRequiredMarker}set hideRequiredMarker(e){this._hideRequiredMarker=hi(e)}_hideRequiredMarker=!1;color="primary";get floatLabel(){return this._floatLabel||this._defaults?.floatLabel||ls}set floatLabel(e){e!==this._floatLabel&&(this._floatLabel=e,this._changeDetectorRef.markForCheck())}_floatLabel;get appearance(){return this._appearanceSignal()}set appearance(e){let t=e||this._defaults?.appearance||dr;this._appearanceSignal.set(t)}_appearanceSignal=T(dr);get subscriptSizing(){return this._subscriptSizing||this._defaults?.subscriptSizing||cr}set subscriptSizing(e){this._subscriptSizing=e||this._defaults?.subscriptSizing||cr}_subscriptSizing=null;get hintLabel(){return this._hintLabel}set hintLabel(e){this._hintLabel=e,this._processHints()}_hintLabel="";_hasIconPrefix=!1;_hasTextPrefix=!1;_hasIconSuffix=!1;_hasTextSuffix=!1;_labelId=this._idGenerator.getId("mat-mdc-form-field-label-");_hintLabelId=this._idGenerator.getId("mat-mdc-hint-");_describedByIds;get _control(){return this._explicitFormFieldControl||this._formFieldControl}set _control(e){this._explicitFormFieldControl=e}_destroyed=new me;_isFocused=null;_explicitFormFieldControl;_previousControl=null;_previousControlValidatorFn=null;_stateChanges;_valueChanges;_describedByChanges;_outlineLabelOffsetResizeObserver=null;_animationsDisabled=Ie();constructor(){let e=this._defaults,t=m(Dt);e&&(e.appearance&&(this.appearance=e.appearance),this._hideRequiredMarker=!!e?.hideRequiredMarker,e.color&&(this.color=e.color)),Gt(()=>this._currentDirection=t.valueSignal()),this._syncOutlineLabelOffset()}ngAfterViewInit(){this._updateFocusState(),this._animationsDisabled||this._ngZone.runOutsideAngular(()=>{setTimeout(()=>{this._elementRef.nativeElement.classList.add("mat-form-field-animations-enabled")},300)}),this._changeDetectorRef.detectChanges()}ngAfterContentInit(){this._assertFormFieldControl(),this._initializeSubscript(),this._initializePrefixAndSuffix()}ngAfterContentChecked(){this._assertFormFieldControl(),this._control!==this._previousControl&&(this._initializeControl(this._previousControl),this._control.ngControl&&this._control.ngControl.control&&(this._previousControlValidatorFn=this._control.ngControl.control.validator),this._previousControl=this._control),this._control.ngControl&&this._control.ngControl.control&&this._control.ngControl.control.validator!==this._previousControlValidatorFn&&this._changeDetectorRef.markForCheck()}ngOnDestroy(){this._outlineLabelOffsetResizeObserver?.disconnect(),this._stateChanges?.unsubscribe(),this._valueChanges?.unsubscribe(),this._describedByChanges?.unsubscribe(),this._destroyed.next(),this._destroyed.complete()}getLabelId=ue(()=>this._hasFloatingLabel()?this._labelId:null);getConnectedOverlayOrigin(){return this._textField||this._elementRef}_animateAndLockLabel(){this._hasFloatingLabel()&&(this.floatLabel="always")}_initializeControl(e){let t=this._control,i="mat-mdc-form-field-type-";e&&this._elementRef.nativeElement.classList.remove(i+e.controlType),t.controlType&&this._elementRef.nativeElement.classList.add(i+t.controlType),this._stateChanges?.unsubscribe(),this._stateChanges=t.stateChanges.subscribe(()=>{this._updateFocusState(),this._changeDetectorRef.markForCheck()}),this._describedByChanges?.unsubscribe(),this._describedByChanges=t.stateChanges.pipe(Ke([void 0,void 0]),at(()=>[t.errorState,t.userAriaDescribedBy]),Oa(),rt(([[r,c],[p,_]])=>r!==p||c!==_)).subscribe(()=>this._syncDescribedByIds()),this._valueChanges?.unsubscribe(),t.ngControl&&t.ngControl.valueChanges&&(this._valueChanges=t.ngControl.valueChanges.pipe(Qe(this._destroyed)).subscribe(()=>this._changeDetectorRef.markForCheck()))}_checkPrefixAndSuffixTypes(){this._hasIconPrefix=!!this._prefixChildren.find(e=>!e._isText),this._hasTextPrefix=!!this._prefixChildren.find(e=>e._isText),this._hasIconSuffix=!!this._suffixChildren.find(e=>!e._isText),this._hasTextSuffix=!!this._suffixChildren.find(e=>e._isText)}_initializePrefixAndSuffix(){this._checkPrefixAndSuffixTypes(),De(this._prefixChildren.changes,this._suffixChildren.changes).subscribe(()=>{this._checkPrefixAndSuffixTypes(),this._changeDetectorRef.markForCheck()})}_initializeSubscript(){this._hintChildren.changes.subscribe(()=>{this._processHints(),this._changeDetectorRef.markForCheck()}),this._errorChildren.changes.subscribe(()=>{this._syncDescribedByIds(),this._changeDetectorRef.markForCheck()}),this._validateHints(),this._syncDescribedByIds()}_assertFormFieldControl(){this._control}_updateFocusState(){let e=this._control.focused;e&&!this._isFocused?(this._isFocused=!0,this._lineRipple?.activate()):!e&&(this._isFocused||this._isFocused===null)&&(this._isFocused=!1,this._lineRipple?.deactivate()),this._elementRef.nativeElement.classList.toggle("mat-focused",e),this._textField?.nativeElement.classList.toggle("mdc-text-field--focused",e)}_syncOutlineLabelOffset(){Ya({earlyRead:()=>{if(this._appearanceSignal()!=="outline")return this._outlineLabelOffsetResizeObserver?.disconnect(),null;if(globalThis.ResizeObserver){this._outlineLabelOffsetResizeObserver||=new globalThis.ResizeObserver(()=>{this._writeOutlinedLabelStyles(this._getOutlinedLabelOffset())});for(let e of this._prefixSuffixContainers())this._outlineLabelOffsetResizeObserver.observe(e,{box:"border-box"})}return this._getOutlinedLabelOffset()},write:e=>this._writeOutlinedLabelStyles(e())})}_shouldAlwaysFloat(){return this.floatLabel==="always"}_hasOutline(){return this.appearance==="outline"}_forceDisplayInfixLabel(){return!this._platform.isBrowser&&this._prefixChildren.length&&!this._shouldLabelFloat()}_hasFloatingLabel=ue(()=>!!this._labelChild());_shouldLabelFloat(){return this._hasFloatingLabel()?this._control.shouldLabelFloat||this._shouldAlwaysFloat():!1}_shouldForward(e){let t=this._control?this._control.ngControl:null;return t&&t[e]}_getSubscriptMessageType(){return this._errorChildren&&this._errorChildren.length>0&&this._control.errorState?"error":"hint"}_handleLabelResized(){this._refreshOutlineNotchWidth()}_refreshOutlineNotchWidth(){!this._hasOutline()||!this._floatingLabel||!this._shouldLabelFloat()?this._notchedOutline?._setNotchWidth(0):this._notchedOutline?._setNotchWidth(this._floatingLabel.getWidth())}_processHints(){this._validateHints(),this._syncDescribedByIds()}_validateHints(){this._hintChildren}_syncDescribedByIds(){if(this._control){let e=[];if(this._control.userAriaDescribedBy&&typeof this._control.userAriaDescribedBy=="string"&&e.push(...this._control.userAriaDescribedBy.split(" ")),this._getSubscriptMessageType()==="hint"){let r=this._hintChildren?this._hintChildren.find(p=>p.align==="start"):null,c=this._hintChildren?this._hintChildren.find(p=>p.align==="end"):null;r?e.push(r.id):this._hintLabel&&e.push(this._hintLabelId),c&&e.push(c.id)}else this._errorChildren&&e.push(...this._errorChildren.map(r=>r.id));let t=this._control.describedByIds,i;if(t){let r=this._describedByIds||e;i=e.concat(t.filter(c=>c&&!r.includes(c)))}else i=e;this._control.setDescribedByIds(i),this._describedByIds=e}}_getOutlinedLabelOffset(){if(!this._hasOutline()||!this._floatingLabel)return null;if(!this._iconPrefixContainer&&!this._textPrefixContainer)return["",null];if(!this._isAttachedToDom())return null;let e=this._iconPrefixContainer?.nativeElement,t=this._textPrefixContainer?.nativeElement,i=this._iconSuffixContainer?.nativeElement,r=this._textSuffixContainer?.nativeElement,c=e?.getBoundingClientRect().width??0,p=t?.getBoundingClientRect().width??0,_=i?.getBoundingClientRect().width??0,k=r?.getBoundingClientRect().width??0,w=this._currentDirection==="rtl"?"-1":"1",M=`${c+p}px`,ne=`calc(${w} * (${M} + var(--mat-mdc-form-field-label-offset-x, 0px)))`,di=`var(--mat-mdc-form-field-label-transform, ${ss} translateX(${ne}))`,Tt=c+p+_+k;return[di,Tt]}_writeOutlinedLabelStyles(e){if(e!==null){let[t,i]=e;this._floatingLabel&&(this._floatingLabel.element.style.transform=t),i!==null&&this._notchedOutline?._setMaxWidth(i)}}_isAttachedToDom(){let e=this._elementRef.nativeElement;if(e.getRootNode){let t=e.getRootNode();return t&&t!==e}return document.documentElement.contains(e)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["mat-form-field"]],contentQueries:function(t,i,r){if(t&1&&(qa(r,i._labelChild,Z,5),lt(r,ki,5)(r,mr,5)(r,oa,5)(r,aa,5)(r,ot,5)),t&2){Qn();let c;O(c=F())&&(i._formFieldControl=c.first),O(c=F())&&(i._prefixChildren=c),O(c=F())&&(i._suffixChildren=c),O(c=F())&&(i._errorChildren=c),O(c=F())&&(i._hintChildren=c)}},viewQuery:function(t,i){if(t&1&&(Ha(i._iconPrefixContainerSignal,tr,5)(i._textPrefixContainerSignal,ir,5)(i._iconSuffixContainerSignal,nr,5)(i._textSuffixContainerSignal,ar,5),Pe(Bl,5)(tr,5)(ir,5)(nr,5)(ar,5)(or,5)(sr,5)(lr,5)),t&2){Qn(4);let r;O(r=F())&&(i._textField=r.first),O(r=F())&&(i._iconPrefixContainer=r.first),O(r=F())&&(i._textPrefixContainer=r.first),O(r=F())&&(i._iconSuffixContainer=r.first),O(r=F())&&(i._textSuffixContainer=r.first),O(r=F())&&(i._floatingLabel=r.first),O(r=F())&&(i._notchedOutline=r.first),O(r=F())&&(i._lineRipple=r.first)}},hostAttrs:[1,"mat-mdc-form-field"],hostVars:38,hostBindings:function(t,i){t&2&&G("mat-mdc-form-field-label-always-float",i._shouldAlwaysFloat())("mat-mdc-form-field-has-icon-prefix",i._hasIconPrefix)("mat-mdc-form-field-has-icon-suffix",i._hasIconSuffix)("mat-form-field-invalid",i._control.errorState)("mat-form-field-disabled",i._control.disabled)("mat-form-field-autofilled",i._control.autofilled)("mat-form-field-appearance-fill",i.appearance=="fill")("mat-form-field-appearance-outline",i.appearance=="outline")("mat-form-field-hide-placeholder",i._hasFloatingLabel()&&!i._shouldLabelFloat())("mat-primary",i.color!=="accent"&&i.color!=="warn")("mat-accent",i.color==="accent")("mat-warn",i.color==="warn")("ng-untouched",i._shouldForward("untouched"))("ng-touched",i._shouldForward("touched"))("ng-pristine",i._shouldForward("pristine"))("ng-dirty",i._shouldForward("dirty"))("ng-valid",i._shouldForward("valid"))("ng-invalid",i._shouldForward("invalid"))("ng-pending",i._shouldForward("pending"))},inputs:{hideRequiredMarker:"hideRequiredMarker",color:"color",floatLabel:"floatLabel",appearance:"appearance",subscriptSizing:"subscriptSizing",hintLabel:"hintLabel"},exportAs:["matFormField"],features:[ve([{provide:Xt,useExisting:n},{provide:pr,useExisting:n}])],ngContentSelectors:Ul,decls:18,vars:21,consts:[["labelTemplate",""],["textField",""],["iconPrefixContainer",""],["textPrefixContainer",""],["textSuffixContainer",""],["iconSuffixContainer",""],[1,"mat-mdc-text-field-wrapper","mdc-text-field",3,"click"],[1,"mat-mdc-form-field-focus-overlay"],[1,"mat-mdc-form-field-flex"],["matFormFieldNotchedOutline","",3,"matFormFieldNotchedOutlineOpen"],[1,"mat-mdc-form-field-icon-prefix"],[1,"mat-mdc-form-field-text-prefix"],[1,"mat-mdc-form-field-infix"],[3,"ngTemplateOutlet"],[1,"mat-mdc-form-field-text-suffix"],[1,"mat-mdc-form-field-icon-suffix"],["matFormFieldLineRipple",""],["aria-atomic","true","aria-live","polite",1,"mat-mdc-form-field-subscript-wrapper","mat-mdc-form-field-bottom-align"],[1,"mat-mdc-form-field-error-wrapper"],[1,"mat-mdc-form-field-hint-wrapper"],["matFormFieldFloatingLabel","",3,"floating","monitorResize","id"],["aria-hidden","true",1,"mat-mdc-form-field-required-marker","mdc-floating-label--required"],[3,"id"],[1,"mat-mdc-form-field-hint-spacer"]],template:function(t,i){if(t&1&&(Ne(zl),ze(0,ql,1,1,"ng-template",null,0,ja),o(2,"div",6,1),C("click",function(c){return i._control.onContainerClick(c)}),h(4,Hl,1,0,"div",7),o(5,"div",8),h(6,Ql,2,2,"div",9),h(7,Yl,3,0,"div",10),h(8,Zl,3,0,"div",11),o(9,"div",12),h(10,Jl,1,1,null,13),re(11),a(),h(12,es,3,0,"div",14),h(13,ts,3,0,"div",15),a(),h(14,is,1,0,"div",16),a(),o(15,"div",17),h(16,ns,2,0,"div",18)(17,os,5,1,"div",19),a()),t&2){let r;d(2),G("mdc-text-field--filled",!i._hasOutline())("mdc-text-field--outlined",i._hasOutline())("mdc-text-field--no-label",!i._hasFloatingLabel())("mdc-text-field--disabled",i._control.disabled)("mdc-text-field--invalid",i._control.errorState),d(2),f(!i._hasOutline()&&!i._control.disabled?4:-1),d(2),f(i._hasOutline()?6:-1),d(),f(i._hasIconPrefix?7:-1),d(),f(i._hasTextPrefix?8:-1),d(2),f(!i._hasOutline()||i._forceDisplayInfixLabel()?10:-1),d(2),f(i._hasTextSuffix?12:-1),d(),f(i._hasIconSuffix?13:-1),d(),f(i._hasOutline()?-1:14),d(),G("mat-mdc-form-field-subscript-dynamic-size",i.subscriptSizing==="dynamic");let c=i._getSubscriptMessageType();d(),f((r=c)==="error"?16:r==="hint"?17:-1)}},dependencies:[or,sr,Ja,lr,ot],styles:[`.mdc-text-field {
  display: inline-flex;
  align-items: baseline;
  padding: 0 16px;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  will-change: opacity, transform, color;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.mdc-text-field__input {
  width: 100%;
  min-width: 0;
  border: none;
  border-radius: 0;
  background: none;
  padding: 0;
  -moz-appearance: none;
  -webkit-appearance: none;
  height: 28px;
}
.mdc-text-field__input::-webkit-calendar-picker-indicator, .mdc-text-field__input::-webkit-search-cancel-button {
  display: none;
}
.mdc-text-field__input::-ms-clear {
  display: none;
}
.mdc-text-field__input:focus {
  outline: none;
}
.mdc-text-field__input:invalid {
  box-shadow: none;
}
.mdc-text-field__input::placeholder {
  opacity: 0;
}
.mdc-text-field__input::-moz-placeholder {
  opacity: 0;
}
.mdc-text-field__input::-webkit-input-placeholder {
  opacity: 0;
}
.mdc-text-field__input:-ms-input-placeholder {
  opacity: 0;
}
.mdc-text-field--no-label .mdc-text-field__input::placeholder, .mdc-text-field--focused .mdc-text-field__input::placeholder {
  opacity: 1;
}
.mdc-text-field--no-label .mdc-text-field__input::-moz-placeholder, .mdc-text-field--focused .mdc-text-field__input::-moz-placeholder {
  opacity: 1;
}
.mdc-text-field--no-label .mdc-text-field__input::-webkit-input-placeholder, .mdc-text-field--focused .mdc-text-field__input::-webkit-input-placeholder {
  opacity: 1;
}
.mdc-text-field--no-label .mdc-text-field__input:-ms-input-placeholder, .mdc-text-field--focused .mdc-text-field__input:-ms-input-placeholder {
  opacity: 1;
}
.mdc-text-field--disabled:not(.mdc-text-field--no-label) .mdc-text-field__input.mat-mdc-input-disabled-interactive::placeholder {
  opacity: 0;
}
.mdc-text-field--disabled:not(.mdc-text-field--no-label) .mdc-text-field__input.mat-mdc-input-disabled-interactive::-moz-placeholder {
  opacity: 0;
}
.mdc-text-field--disabled:not(.mdc-text-field--no-label) .mdc-text-field__input.mat-mdc-input-disabled-interactive::-webkit-input-placeholder {
  opacity: 0;
}
.mdc-text-field--disabled:not(.mdc-text-field--no-label) .mdc-text-field__input.mat-mdc-input-disabled-interactive:-ms-input-placeholder {
  opacity: 0;
}
.mdc-text-field--outlined .mdc-text-field__input, .mdc-text-field--filled.mdc-text-field--no-label .mdc-text-field__input {
  height: 100%;
}
.mdc-text-field--outlined .mdc-text-field__input {
  display: flex;
  border: none !important;
  background-color: transparent;
}
.mdc-text-field--disabled .mdc-text-field__input {
  pointer-events: auto;
}
.mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-text-field__input {
  color: var(--mat-form-field-filled-input-text-color, var(--mat-sys-on-surface));
  caret-color: var(--mat-form-field-filled-caret-color, var(--mat-sys-primary));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-text-field__input::placeholder {
  color: var(--mat-form-field-filled-input-text-placeholder-color, var(--mat-sys-on-surface-variant));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-text-field__input::-moz-placeholder {
  color: var(--mat-form-field-filled-input-text-placeholder-color, var(--mat-sys-on-surface-variant));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-text-field__input::-webkit-input-placeholder {
  color: var(--mat-form-field-filled-input-text-placeholder-color, var(--mat-sys-on-surface-variant));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-text-field__input:-ms-input-placeholder {
  color: var(--mat-form-field-filled-input-text-placeholder-color, var(--mat-sys-on-surface-variant));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-text-field__input {
  color: var(--mat-form-field-outlined-input-text-color, var(--mat-sys-on-surface));
  caret-color: var(--mat-form-field-outlined-caret-color, var(--mat-sys-primary));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-text-field__input::placeholder {
  color: var(--mat-form-field-outlined-input-text-placeholder-color, var(--mat-sys-on-surface-variant));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-text-field__input::-moz-placeholder {
  color: var(--mat-form-field-outlined-input-text-placeholder-color, var(--mat-sys-on-surface-variant));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-text-field__input::-webkit-input-placeholder {
  color: var(--mat-form-field-outlined-input-text-placeholder-color, var(--mat-sys-on-surface-variant));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-text-field__input:-ms-input-placeholder {
  color: var(--mat-form-field-outlined-input-text-placeholder-color, var(--mat-sys-on-surface-variant));
}
.mdc-text-field--filled.mdc-text-field--invalid:not(.mdc-text-field--disabled) .mdc-text-field__input {
  caret-color: var(--mat-form-field-filled-error-caret-color, var(--mat-sys-error));
}
.mdc-text-field--outlined.mdc-text-field--invalid:not(.mdc-text-field--disabled) .mdc-text-field__input {
  caret-color: var(--mat-form-field-outlined-error-caret-color, var(--mat-sys-error));
}
.mdc-text-field--filled.mdc-text-field--disabled .mdc-text-field__input {
  color: var(--mat-form-field-filled-disabled-input-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mdc-text-field--outlined.mdc-text-field--disabled .mdc-text-field__input {
  color: var(--mat-form-field-outlined-disabled-input-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
@media (forced-colors: active) {
  .mdc-text-field--disabled .mdc-text-field__input {
    background-color: Window;
  }
}

.mdc-text-field--filled {
  height: 56px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
  border-top-left-radius: var(--mat-form-field-filled-container-shape, var(--mat-sys-corner-extra-small));
  border-top-right-radius: var(--mat-form-field-filled-container-shape, var(--mat-sys-corner-extra-small));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled) {
  background-color: var(--mat-form-field-filled-container-color, var(--mat-sys-surface-variant));
}
.mdc-text-field--filled.mdc-text-field--disabled {
  background-color: var(--mat-form-field-filled-disabled-container-color, color-mix(in srgb, var(--mat-sys-on-surface) 4%, transparent));
}

.mdc-text-field--outlined {
  height: 56px;
  overflow: visible;
  padding-right: max(16px, var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small)));
  padding-left: max(16px, var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small)) + 4px);
}
[dir=rtl] .mdc-text-field--outlined {
  padding-right: max(16px, var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small)) + 4px);
  padding-left: max(16px, var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small)));
}

.mdc-floating-label {
  position: absolute;
  left: 0;
  transform-origin: left top;
  line-height: 1.15rem;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
  overflow: hidden;
  will-change: transform;
}
[dir=rtl] .mdc-floating-label {
  right: 0;
  left: auto;
  transform-origin: right top;
  text-align: right;
}
.mdc-text-field .mdc-floating-label {
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
.mdc-notched-outline .mdc-floating-label {
  display: inline-block;
  position: relative;
  max-width: 100%;
}
.mdc-text-field--outlined .mdc-floating-label {
  left: 4px;
  right: auto;
}
[dir=rtl] .mdc-text-field--outlined .mdc-floating-label {
  left: auto;
  right: 4px;
}
.mdc-text-field--filled .mdc-floating-label {
  left: 16px;
  right: auto;
}
[dir=rtl] .mdc-text-field--filled .mdc-floating-label {
  left: auto;
  right: 16px;
}
.mdc-text-field--disabled .mdc-floating-label {
  cursor: default;
}
@media (forced-colors: active) {
  .mdc-text-field--disabled .mdc-floating-label {
    z-index: 1;
  }
}
.mdc-text-field--filled.mdc-text-field--no-label .mdc-floating-label {
  display: none;
}
.mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-floating-label {
  color: var(--mat-form-field-filled-label-text-color, var(--mat-sys-on-surface-variant));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-floating-label {
  color: var(--mat-form-field-filled-focus-label-text-color, var(--mat-sys-primary));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mdc-floating-label {
  color: var(--mat-form-field-filled-hover-label-text-color, var(--mat-sys-on-surface-variant));
}
.mdc-text-field--filled.mdc-text-field--disabled .mdc-floating-label {
  color: var(--mat-form-field-filled-disabled-label-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled).mdc-text-field--invalid .mdc-floating-label {
  color: var(--mat-form-field-filled-error-label-text-color, var(--mat-sys-error));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled).mdc-text-field--invalid.mdc-text-field--focused .mdc-floating-label {
  color: var(--mat-form-field-filled-error-focus-label-text-color, var(--mat-sys-error));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled).mdc-text-field--invalid:not(.mdc-text-field--disabled):hover .mdc-floating-label {
  color: var(--mat-form-field-filled-error-hover-label-text-color, var(--mat-sys-on-error-container));
}
.mdc-text-field--filled .mdc-floating-label {
  font-family: var(--mat-form-field-filled-label-text-font, var(--mat-sys-body-large-font));
  font-size: var(--mat-form-field-filled-label-text-size, var(--mat-sys-body-large-size));
  font-weight: var(--mat-form-field-filled-label-text-weight, var(--mat-sys-body-large-weight));
  letter-spacing: var(--mat-form-field-filled-label-text-tracking, var(--mat-sys-body-large-tracking));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-floating-label {
  color: var(--mat-form-field-outlined-label-text-color, var(--mat-sys-on-surface-variant));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-floating-label {
  color: var(--mat-form-field-outlined-focus-label-text-color, var(--mat-sys-primary));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mdc-floating-label {
  color: var(--mat-form-field-outlined-hover-label-text-color, var(--mat-sys-on-surface));
}
.mdc-text-field--outlined.mdc-text-field--disabled .mdc-floating-label {
  color: var(--mat-form-field-outlined-disabled-label-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid .mdc-floating-label {
  color: var(--mat-form-field-outlined-error-label-text-color, var(--mat-sys-error));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid.mdc-text-field--focused .mdc-floating-label {
  color: var(--mat-form-field-outlined-error-focus-label-text-color, var(--mat-sys-error));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid:not(.mdc-text-field--disabled):hover .mdc-floating-label {
  color: var(--mat-form-field-outlined-error-hover-label-text-color, var(--mat-sys-on-error-container));
}
.mdc-text-field--outlined .mdc-floating-label {
  font-family: var(--mat-form-field-outlined-label-text-font, var(--mat-sys-body-large-font));
  font-size: var(--mat-form-field-outlined-label-text-size, var(--mat-sys-body-large-size));
  font-weight: var(--mat-form-field-outlined-label-text-weight, var(--mat-sys-body-large-weight));
  letter-spacing: var(--mat-form-field-outlined-label-text-tracking, var(--mat-sys-body-large-tracking));
}

.mdc-floating-label--float-above {
  cursor: auto;
  transform: translateY(-106%) scale(0.75);
}
.mdc-text-field--filled .mdc-floating-label--float-above {
  transform: translateY(-106%) scale(0.75);
}
.mdc-text-field--outlined .mdc-floating-label--float-above {
  transform: translateY(-37.25px) scale(1);
  font-size: 0.75rem;
}
.mdc-notched-outline .mdc-floating-label--float-above {
  text-overflow: clip;
}
.mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  max-width: 133.3333333333%;
}
.mdc-text-field--outlined.mdc-notched-outline--upgraded .mdc-floating-label--float-above, .mdc-text-field--outlined .mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  transform: translateY(-34.75px) scale(0.75);
}
.mdc-text-field--outlined.mdc-notched-outline--upgraded .mdc-floating-label--float-above, .mdc-text-field--outlined .mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  font-size: 1rem;
}

.mdc-floating-label--required:not(.mdc-floating-label--hide-required-marker)::after {
  margin-left: 1px;
  margin-right: 0;
  content: "*";
}
[dir=rtl] .mdc-floating-label--required:not(.mdc-floating-label--hide-required-marker)::after {
  margin-left: 0;
  margin-right: 1px;
}

.mdc-notched-outline {
  display: flex;
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: 100%;
  text-align: left;
  pointer-events: none;
}
[dir=rtl] .mdc-notched-outline {
  text-align: right;
}
.mdc-text-field--outlined .mdc-notched-outline {
  z-index: 1;
}

.mat-mdc-notch-piece {
  box-sizing: border-box;
  height: 100%;
  pointer-events: none;
  border: none;
  border-top: 1px solid;
  border-bottom: 1px solid;
}
.mdc-text-field--focused .mat-mdc-notch-piece {
  border-width: 2px;
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled) .mat-mdc-notch-piece {
  border-color: var(--mat-form-field-outlined-outline-color, var(--mat-sys-outline));
  border-width: var(--mat-form-field-outlined-outline-width, 1px);
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mat-mdc-notch-piece {
  border-color: var(--mat-form-field-outlined-hover-outline-color, var(--mat-sys-on-surface));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled).mdc-text-field--focused .mat-mdc-notch-piece {
  border-color: var(--mat-form-field-outlined-focus-outline-color, var(--mat-sys-primary));
}
.mdc-text-field--outlined.mdc-text-field--disabled .mat-mdc-notch-piece {
  border-color: var(--mat-form-field-outlined-disabled-outline-color, color-mix(in srgb, var(--mat-sys-on-surface) 12%, transparent));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid .mat-mdc-notch-piece {
  border-color: var(--mat-form-field-outlined-error-outline-color, var(--mat-sys-error));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid:not(.mdc-text-field--focused):hover .mdc-notched-outline .mat-mdc-notch-piece {
  border-color: var(--mat-form-field-outlined-error-hover-outline-color, var(--mat-sys-on-error-container));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid.mdc-text-field--focused .mat-mdc-notch-piece {
  border-color: var(--mat-form-field-outlined-error-focus-outline-color, var(--mat-sys-error));
}
.mdc-text-field--outlined:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-notched-outline .mat-mdc-notch-piece {
  border-width: var(--mat-form-field-outlined-focus-outline-width, 2px);
}

.mdc-notched-outline__leading {
  border-left: 1px solid;
  border-right: none;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-top-left-radius: var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small));
  border-bottom-left-radius: var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small));
}
.mdc-text-field--outlined .mdc-notched-outline .mdc-notched-outline__leading {
  width: max(12px, var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small)));
}
[dir=rtl] .mdc-notched-outline__leading {
  border-left: none;
  border-right: 1px solid;
  border-bottom-left-radius: 0;
  border-top-left-radius: 0;
  border-top-right-radius: var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small));
  border-bottom-right-radius: var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small));
}

.mdc-notched-outline__trailing {
  flex-grow: 1;
  border-left: none;
  border-right: 1px solid;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-top-right-radius: var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small));
  border-bottom-right-radius: var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small));
}
[dir=rtl] .mdc-notched-outline__trailing {
  border-left: 1px solid;
  border-right: none;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-top-left-radius: var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small));
  border-bottom-left-radius: var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small));
}

.mdc-notched-outline__notch {
  flex: 0 0 auto;
  width: auto;
}
.mdc-text-field--outlined .mdc-notched-outline .mdc-notched-outline__notch {
  max-width: min(var(--mat-form-field-notch-max-width, 100%), calc(100% - max(12px, var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small))) * 2));
}
.mdc-text-field--outlined .mdc-notched-outline--notched .mdc-notched-outline__notch {
  max-width: min(100%, calc(100% - max(12px, var(--mat-form-field-outlined-container-shape, var(--mat-sys-corner-extra-small))) * 2));
}
.mdc-text-field--outlined .mdc-notched-outline--notched .mdc-notched-outline__notch {
  padding-top: 1px;
}
.mdc-text-field--focused.mdc-text-field--outlined .mdc-notched-outline--notched .mdc-notched-outline__notch {
  padding-top: 2px;
}
.mdc-notched-outline--notched .mdc-notched-outline__notch {
  padding-left: 0;
  padding-right: 8px;
  border-top: none;
}
[dir=rtl] .mdc-notched-outline--notched .mdc-notched-outline__notch {
  padding-left: 8px;
  padding-right: 0;
}
.mdc-notched-outline--no-label .mdc-notched-outline__notch {
  display: none;
}

.mdc-line-ripple::before, .mdc-line-ripple::after {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  border-bottom-style: solid;
  content: "";
}
.mdc-line-ripple::before {
  z-index: 1;
  border-bottom-width: var(--mat-form-field-filled-active-indicator-height, 1px);
}
.mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-line-ripple::before {
  border-bottom-color: var(--mat-form-field-filled-active-indicator-color, var(--mat-sys-on-surface-variant));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mdc-line-ripple::before {
  border-bottom-color: var(--mat-form-field-filled-hover-active-indicator-color, var(--mat-sys-on-surface));
}
.mdc-text-field--filled.mdc-text-field--disabled .mdc-line-ripple::before {
  border-bottom-color: var(--mat-form-field-filled-disabled-active-indicator-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled).mdc-text-field--invalid .mdc-line-ripple::before {
  border-bottom-color: var(--mat-form-field-filled-error-active-indicator-color, var(--mat-sys-error));
}
.mdc-text-field--filled:not(.mdc-text-field--disabled).mdc-text-field--invalid:not(.mdc-text-field--focused):hover .mdc-line-ripple::before {
  border-bottom-color: var(--mat-form-field-filled-error-hover-active-indicator-color, var(--mat-sys-on-error-container));
}
.mdc-line-ripple::after {
  transform: scaleX(0);
  opacity: 0;
  z-index: 2;
}
.mdc-text-field--filled .mdc-line-ripple::after {
  border-bottom-width: var(--mat-form-field-filled-focus-active-indicator-height, 2px);
}
.mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-line-ripple::after {
  border-bottom-color: var(--mat-form-field-filled-focus-active-indicator-color, var(--mat-sys-primary));
}
.mdc-text-field--filled.mdc-text-field--invalid:not(.mdc-text-field--disabled) .mdc-line-ripple::after {
  border-bottom-color: var(--mat-form-field-filled-error-focus-active-indicator-color, var(--mat-sys-error));
}

.mdc-line-ripple--active::after {
  transform: scaleX(1);
  opacity: 1;
}

.mdc-line-ripple--deactivating::after {
  opacity: 0;
}

.mdc-text-field--disabled {
  pointer-events: none;
}

.mat-mdc-form-field-textarea-control {
  vertical-align: middle;
  resize: vertical;
  box-sizing: border-box;
  height: auto;
  margin: 0;
  padding: 0;
  border: none;
  overflow: auto;
}

.mat-mdc-form-field-input-control.mat-mdc-form-field-input-control {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  font: inherit;
  letter-spacing: inherit;
  text-decoration: inherit;
  text-transform: inherit;
  border: none;
}

.mat-mdc-form-field .mat-mdc-floating-label.mdc-floating-label {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  line-height: normal;
  pointer-events: all;
  will-change: auto;
}

.mat-mdc-form-field:not(.mat-form-field-disabled) .mat-mdc-floating-label.mdc-floating-label {
  cursor: inherit;
}

.mdc-text-field--no-label:not(.mdc-text-field--textarea) .mat-mdc-form-field-input-control.mdc-text-field__input,
.mat-mdc-text-field-wrapper .mat-mdc-form-field-input-control {
  height: auto;
}

.mat-mdc-text-field-wrapper .mat-mdc-form-field-input-control.mdc-text-field__input[type=color] {
  height: 23px;
}

.mat-mdc-text-field-wrapper {
  height: auto;
  flex: auto;
  will-change: auto;
}

.mat-mdc-form-field-has-icon-prefix .mat-mdc-text-field-wrapper {
  padding-left: 0;
  --mat-mdc-form-field-label-offset-x: -16px;
}

.mat-mdc-form-field-has-icon-suffix .mat-mdc-text-field-wrapper {
  padding-right: 0;
}

[dir=rtl] .mat-mdc-text-field-wrapper {
  padding-left: 16px;
  padding-right: 16px;
}
[dir=rtl] .mat-mdc-form-field-has-icon-suffix .mat-mdc-text-field-wrapper {
  padding-left: 0;
}
[dir=rtl] .mat-mdc-form-field-has-icon-prefix .mat-mdc-text-field-wrapper {
  padding-right: 0;
}

.mat-form-field-disabled .mdc-text-field__input::placeholder {
  color: var(--mat-form-field-disabled-input-text-placeholder-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-form-field-disabled .mdc-text-field__input::-moz-placeholder {
  color: var(--mat-form-field-disabled-input-text-placeholder-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-form-field-disabled .mdc-text-field__input::-webkit-input-placeholder {
  color: var(--mat-form-field-disabled-input-text-placeholder-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-form-field-disabled .mdc-text-field__input:-ms-input-placeholder {
  color: var(--mat-form-field-disabled-input-text-placeholder-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}

.mat-mdc-form-field-label-always-float .mdc-text-field__input::placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
  opacity: 1;
}

.mat-mdc-text-field-wrapper .mat-mdc-form-field-infix .mat-mdc-floating-label {
  left: auto;
  right: auto;
}

.mat-mdc-text-field-wrapper.mdc-text-field--outlined .mdc-text-field__input {
  display: inline-block;
}

.mat-mdc-form-field .mat-mdc-text-field-wrapper.mdc-text-field .mdc-notched-outline__notch {
  padding-top: 0;
}

.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field .mdc-notched-outline__notch {
  border-left: 1px solid transparent;
}

[dir=rtl] .mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field .mdc-notched-outline__notch {
  border-left: none;
  border-right: 1px solid transparent;
}

.mat-mdc-form-field-infix {
  min-height: var(--mat-form-field-container-height, 56px);
  padding-top: var(--mat-form-field-filled-with-label-container-padding-top, 24px);
  padding-bottom: var(--mat-form-field-filled-with-label-container-padding-bottom, 8px);
}
.mdc-text-field--outlined .mat-mdc-form-field-infix, .mdc-text-field--no-label .mat-mdc-form-field-infix {
  padding-top: var(--mat-form-field-container-vertical-padding, 16px);
  padding-bottom: var(--mat-form-field-container-vertical-padding, 16px);
}

.mat-mdc-text-field-wrapper .mat-mdc-form-field-flex .mat-mdc-floating-label {
  top: calc(var(--mat-form-field-container-height, 56px) / 2);
}

.mdc-text-field--filled .mat-mdc-floating-label {
  display: var(--mat-form-field-filled-label-display, block);
}

.mat-mdc-text-field-wrapper.mdc-text-field--outlined .mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  --mat-mdc-form-field-label-transform: translateY(calc(calc(6.75px + var(--mat-form-field-container-height, 56px) / 2) * -1))
    scale(var(--mat-mdc-form-field-floating-label-scale, 0.75));
  transform: var(--mat-mdc-form-field-label-transform);
}

@keyframes _mat-form-field-subscript-animation {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.mat-mdc-form-field-subscript-wrapper {
  box-sizing: border-box;
  width: 100%;
  position: relative;
}

.mat-mdc-form-field-hint-wrapper,
.mat-mdc-form-field-error-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 0 16px;
  opacity: 1;
  transform: translateY(0);
  animation: _mat-form-field-subscript-animation 0ms cubic-bezier(0.55, 0, 0.55, 0.2);
}

.mat-mdc-form-field-subscript-dynamic-size .mat-mdc-form-field-hint-wrapper,
.mat-mdc-form-field-subscript-dynamic-size .mat-mdc-form-field-error-wrapper {
  position: static;
}

.mat-mdc-form-field-bottom-align::before {
  content: "";
  display: inline-block;
  height: 16px;
}

.mat-mdc-form-field-bottom-align.mat-mdc-form-field-subscript-dynamic-size::before {
  content: unset;
}

.mat-mdc-form-field-hint-end {
  order: 1;
}

.mat-mdc-form-field-hint-wrapper {
  display: flex;
}

.mat-mdc-form-field-hint-spacer {
  flex: 1 0 1em;
}

.mat-mdc-form-field-error {
  display: block;
  color: var(--mat-form-field-error-text-color, var(--mat-sys-error));
}

.mat-mdc-form-field-subscript-wrapper,
.mat-mdc-form-field-bottom-align::before {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  font-family: var(--mat-form-field-subscript-text-font, var(--mat-sys-body-small-font));
  line-height: var(--mat-form-field-subscript-text-line-height, var(--mat-sys-body-small-line-height));
  font-size: var(--mat-form-field-subscript-text-size, var(--mat-sys-body-small-size));
  letter-spacing: var(--mat-form-field-subscript-text-tracking, var(--mat-sys-body-small-tracking));
  font-weight: var(--mat-form-field-subscript-text-weight, var(--mat-sys-body-small-weight));
}

.mat-mdc-form-field-focus-overlay {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  opacity: 0;
  pointer-events: none;
  background-color: var(--mat-form-field-state-layer-color, var(--mat-sys-on-surface));
}
.mat-mdc-text-field-wrapper:hover .mat-mdc-form-field-focus-overlay {
  opacity: var(--mat-form-field-hover-state-layer-opacity, var(--mat-sys-hover-state-layer-opacity));
}
.mat-mdc-form-field.mat-focused .mat-mdc-form-field-focus-overlay {
  opacity: var(--mat-form-field-focus-state-layer-opacity, 0);
}

select.mat-mdc-form-field-input-control {
  -moz-appearance: none;
  -webkit-appearance: none;
  background-color: transparent;
  display: inline-flex;
  box-sizing: border-box;
}
select.mat-mdc-form-field-input-control:not(:disabled) {
  cursor: pointer;
}
select.mat-mdc-form-field-input-control:not(.mat-mdc-native-select-inline) option {
  color: var(--mat-form-field-select-option-text-color, var(--mat-sys-neutral10));
}
select.mat-mdc-form-field-input-control:not(.mat-mdc-native-select-inline) option:disabled {
  color: var(--mat-form-field-select-disabled-option-text-color, color-mix(in srgb, var(--mat-sys-neutral10) 38%, transparent));
}

.mat-mdc-form-field-type-mat-native-select .mat-mdc-form-field-infix::after {
  content: "";
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid;
  position: absolute;
  right: 0;
  top: 50%;
  margin-top: -2.5px;
  pointer-events: none;
  color: var(--mat-form-field-enabled-select-arrow-color, var(--mat-sys-on-surface-variant));
}
[dir=rtl] .mat-mdc-form-field-type-mat-native-select .mat-mdc-form-field-infix::after {
  right: auto;
  left: 0;
}
.mat-mdc-form-field-type-mat-native-select.mat-focused .mat-mdc-form-field-infix::after {
  color: var(--mat-form-field-focus-select-arrow-color, var(--mat-sys-primary));
}
.mat-mdc-form-field-type-mat-native-select.mat-form-field-disabled .mat-mdc-form-field-infix::after {
  color: var(--mat-form-field-disabled-select-arrow-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-mdc-form-field-type-mat-native-select .mat-mdc-form-field-input-control {
  padding-right: 15px;
}
[dir=rtl] .mat-mdc-form-field-type-mat-native-select .mat-mdc-form-field-input-control {
  padding-right: 0;
  padding-left: 15px;
}

@media (forced-colors: active) {
  .mat-form-field-appearance-fill .mat-mdc-text-field-wrapper {
    outline: solid 1px;
  }
}
@media (forced-colors: active) {
  .mat-form-field-appearance-fill.mat-form-field-disabled .mat-mdc-text-field-wrapper {
    outline-color: GrayText;
  }
}

@media (forced-colors: active) {
  .mat-form-field-appearance-fill.mat-focused .mat-mdc-text-field-wrapper {
    outline: dashed 3px;
  }
}

@media (forced-colors: active) {
  .mat-mdc-form-field.mat-focused .mdc-notched-outline {
    border: dashed 3px;
  }
}

.mat-mdc-form-field-input-control[type=date], .mat-mdc-form-field-input-control[type=datetime], .mat-mdc-form-field-input-control[type=datetime-local], .mat-mdc-form-field-input-control[type=month], .mat-mdc-form-field-input-control[type=week], .mat-mdc-form-field-input-control[type=time] {
  line-height: 1;
}
.mat-mdc-form-field-input-control::-webkit-datetime-edit {
  line-height: 1;
  padding: 0;
  margin-bottom: -2px;
}

.mat-mdc-form-field {
  --mat-mdc-form-field-floating-label-scale: 0.75;
  display: inline-flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  font-family: var(--mat-form-field-container-text-font, var(--mat-sys-body-large-font));
  line-height: var(--mat-form-field-container-text-line-height, var(--mat-sys-body-large-line-height));
  font-size: var(--mat-form-field-container-text-size, var(--mat-sys-body-large-size));
  letter-spacing: var(--mat-form-field-container-text-tracking, var(--mat-sys-body-large-tracking));
  font-weight: var(--mat-form-field-container-text-weight, var(--mat-sys-body-large-weight));
}
.mat-mdc-form-field .mdc-text-field--outlined .mdc-floating-label--float-above {
  font-size: calc(var(--mat-form-field-outlined-label-text-populated-size) * var(--mat-mdc-form-field-floating-label-scale));
}
.mat-mdc-form-field .mdc-text-field--outlined .mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  font-size: var(--mat-form-field-outlined-label-text-populated-size);
}
[dir=rtl] .mat-mdc-form-field {
  text-align: right;
}

.mat-mdc-form-field-flex {
  display: inline-flex;
  align-items: baseline;
  box-sizing: border-box;
  width: 100%;
}

.mat-mdc-text-field-wrapper {
  width: 100%;
  z-index: 0;
}

.mat-mdc-form-field-icon-prefix,
.mat-mdc-form-field-icon-suffix {
  align-self: center;
  line-height: 0;
  pointer-events: auto;
  position: relative;
  z-index: 1;
}
.mat-mdc-form-field-icon-prefix > .mat-icon,
.mat-mdc-form-field-icon-suffix > .mat-icon {
  padding: 0 12px;
  box-sizing: content-box;
}

.mat-mdc-form-field-icon-prefix {
  color: var(--mat-form-field-leading-icon-color, var(--mat-sys-on-surface-variant));
}
.mat-form-field-disabled .mat-mdc-form-field-icon-prefix {
  color: var(--mat-form-field-disabled-leading-icon-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}

.mat-mdc-form-field-icon-suffix {
  color: var(--mat-form-field-trailing-icon-color, var(--mat-sys-on-surface-variant));
}
.mat-form-field-disabled .mat-mdc-form-field-icon-suffix {
  color: var(--mat-form-field-disabled-trailing-icon-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-form-field-invalid .mat-mdc-form-field-icon-suffix {
  color: var(--mat-form-field-error-trailing-icon-color, var(--mat-sys-error));
}
.mat-form-field-invalid:not(.mat-focused):not(.mat-form-field-disabled) .mat-mdc-text-field-wrapper:hover .mat-mdc-form-field-icon-suffix {
  color: var(--mat-form-field-error-hover-trailing-icon-color, var(--mat-sys-on-error-container));
}
.mat-form-field-invalid.mat-focused .mat-mdc-text-field-wrapper .mat-mdc-form-field-icon-suffix {
  color: var(--mat-form-field-error-focus-trailing-icon-color, var(--mat-sys-error));
}

.mat-mdc-form-field-icon-prefix,
[dir=rtl] .mat-mdc-form-field-icon-suffix {
  padding: 0 4px 0 0;
}

.mat-mdc-form-field-icon-suffix,
[dir=rtl] .mat-mdc-form-field-icon-prefix {
  padding: 0 0 0 4px;
}

.mat-mdc-form-field-subscript-wrapper .mat-icon,
.mat-mdc-form-field label .mat-icon {
  width: 1em;
  height: 1em;
  font-size: inherit;
}

.mat-mdc-form-field-infix {
  flex: auto;
  min-width: 0;
  width: 180px;
  position: relative;
  box-sizing: border-box;
}
.mat-mdc-form-field-infix:has(textarea[cols]) {
  width: auto;
}

.mat-mdc-form-field .mdc-notched-outline__notch {
  margin-left: -1px;
  -webkit-clip-path: inset(-9em -999em -9em 1px);
  clip-path: inset(-9em -999em -9em 1px);
}
[dir=rtl] .mat-mdc-form-field .mdc-notched-outline__notch {
  margin-left: 0;
  margin-right: -1px;
  -webkit-clip-path: inset(-9em 1px -9em -999em);
  clip-path: inset(-9em 1px -9em -999em);
}

.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-floating-label {
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1), color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input {
  transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input::placeholder {
  transition: opacity 67ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input::-moz-placeholder {
  transition: opacity 67ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input::-webkit-input-placeholder {
  transition: opacity 67ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input:-ms-input-placeholder {
  transition: opacity 67ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--no-label .mdc-text-field__input::placeholder, .mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--focused .mdc-text-field__input::placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--no-label .mdc-text-field__input::-moz-placeholder, .mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--focused .mdc-text-field__input::-moz-placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--no-label .mdc-text-field__input::-webkit-input-placeholder, .mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--focused .mdc-text-field__input::-webkit-input-placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--no-label .mdc-text-field__input:-ms-input-placeholder, .mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--focused .mdc-text-field__input:-ms-input-placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field--filled:not(.mdc-ripple-upgraded):focus .mdc-text-field__ripple::before {
  transition-duration: 75ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-line-ripple::after {
  transition: transform 180ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mat-mdc-form-field-hint-wrapper,
.mat-mdc-form-field.mat-form-field-animations-enabled .mat-mdc-form-field-error-wrapper {
  animation-duration: 300ms;
}

.mdc-notched-outline .mdc-floating-label {
  max-width: calc(100% + 1px);
}

.mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  max-width: calc(133.3333333333% + 1px);
}
`],encapsulation:2,changeDetection:0})}return n})();var he=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=we({type:n});static \u0275inj=ke({imports:[uo,te,Fe]})}return n})();var hr={fill:"#b1b1b1",stroke:"#50505f"},ds=24,cs=1.6,ms="#e6e6e6",ps=.15,us=1,hs=1,fs=15e3,gs=25e3,_s=.9,bs=1.25;function fr(n){let s=n.baseSizePx??ds,e=n.unconfirmedFill??ms,t=n.unconfirmedOpacity??ps,i=n.targetState==="confirmed",r=i?vs(n.collisionRiskRating):"none",c=s,p,_,k,w,M,ie,ne;return i||(p=e,k=t,w=t),i&&n.isStationary&&(k=0),n.targetKind==="moving"&&r!=="none"?(ie=r==="high"?"red":"yellow",ne=_s,{fill:p,stroke:_,auraColor:ie,auraOpacity:ne,fillOpacity:k,strokeOpacity:w,strokeWidth:M,sizePx:Math.round(s*bs)}):{fill:p,stroke:_,auraColor:ie,auraOpacity:ne,fillOpacity:k,strokeOpacity:w,strokeWidth:M,sizePx:c}}function gr(n,s){let e=ys(n,s),t=Cs(n,s.sizePx),i=s.auraColor?Ss(t):t;return Ts(i,ws(e))}function la(n){return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(n).replace(/%0A/g,"").replace(/%0D/g,"")}`}function vs(n){return typeof n!="number"||!Number.isFinite(n)?"none":n<fs?"high":n<gs?"low":"none"}function Cs(n,s){let e=`${s}px`;return/<svg[^>]*\bwidth=/.test(n)?n=n.replace(/\bwidth="[^"]*"/i,`width="${e}"`):n=n.replace(/<svg\b/i,`<svg width="${e}"`),/<svg[^>]*\bheight=/.test(n)?n=n.replace(/\bheight="[^"]*"/i,`height="${e}"`):n=n.replace(/<svg\b/i,`<svg height="${e}"`),n}function ys(n,s){let e=xs(n);return{fill:Jt(s.fill,e.fill,hr.fill),stroke:Jt(s.stroke,e.stroke,hr.stroke),strokeDasharray:Jt(s.strokeStyle,e.strokeStyle,"solid"),auraColor:Jt(s.auraColor,e.auraColor,"transparent"),auraOpacity:Jt(s.auraOpacity,e.auraOpacity,0),strokeWidth:Jt(s.strokeWidth,e.strokeWidth,cs),fillOpacity:Jt(s.fillOpacity,e.fillOpacity,us),strokeOpacity:Jt(s.strokeOpacity,e.strokeOpacity,hs)}}function xs(n){return{fill:Bi(n,"--icon-fill"),stroke:Bi(n,"--icon-stroke"),strokeStyle:Bi(n,"--icon-stroke-dasharray"),auraColor:Bi(n,"--icon-aura-color"),auraOpacity:Dn(n,"--icon-aura-opacity"),strokeWidth:Dn(n,"--icon-stroke-width"),fillOpacity:Dn(n,"--icon-fill-opacity"),strokeOpacity:Dn(n,"--icon-stroke-opacity")}}function Bi(n,s){let e=n.match(new RegExp(`${ks(s)}:\\s*([^;]+);`,"i"));return e?e[1].trim():void 0}function Dn(n,s){let e=Bi(n,s);if(!e)return;let t=Number(e);return Number.isFinite(t)?t:void 0}function ks(n){return n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function Jt(n,s,e){return n!==void 0?n:s!==void 0?s:e}function ws(n){return[":root {",`--icon-fill: ${n.fill};`,`--icon-fill-opacity: ${ra(n.fillOpacity)};`,`--icon-stroke: ${n.stroke};`,`--icon-stroke-dasharray: ${n.strokeDasharray};`,`--icon-aura-color: ${n.auraColor};`,`--icon-aura-opacity: ${ra(n.auraOpacity)};`,`--icon-stroke-width: ${n.strokeWidth};`,`--icon-stroke-opacity: ${ra(n.strokeOpacity)};`,"}"].join("")}function Ss(n){if(n.includes('id="icon-aura"')||n.includes("id='icon-aura'"))return n;let s=Ms(n)??{minX:0,minY:0,width:24,height:24},e=s.minX+s.width/2,t=s.minY+s.height/2,i=Math.min(s.width,s.height)/2,r=["<defs>",'<radialGradient id="icon-aura" cx="50%" cy="50%" r="50%">','<stop offset="0%" stop-color="var(--icon-aura-color)" stop-opacity="var(--icon-aura-opacity)" />','<stop offset="100%" stop-color="var(--icon-aura-color)" stop-opacity="0" />',"</radialGradient>","</defs>"].join(""),c=`<circle class="icon-aura" cx="${e}" cy="${t}" r="${i}" fill="url(#icon-aura)" />`;return n.replace(/<svg[^>]*>/i,p=>`${p}${r}${c}`)}function Ms(n){let s=n.match(/viewBox="([^"]+)"/i);if(!s)return null;let e=s[1].trim().split(/\s+/).map(t=>Number(t));return e.length!==4||e.some(t=>!Number.isFinite(t))?null:{minX:e[0],minY:e[1],width:e[2],height:e[3]}}function Ts(n,s){let e=n.match(/(<style[^>]*>)([\s\S]*?)(<\/style>)/i);if(e){let[,t,,i]=e;return n.replace(e[0],`${t}${s}${i}`)}return n.replace(/<svg[^>]*>/i,t=>`${t}<style>${s}</style>`)}function ra(n){return Number.isFinite(n)?Math.min(1,Math.max(0,n)):1}var _r=new Map,sa=new Map,br=new Map,vr=new Map,Cr=new Map,yr='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#12f802" stroke="#fb05eb" stroke-width="1.4"/></svg>',Es={"aton/other":"assets/svg/AtoN/other/aton.svg","aton/basestation":"assets/svg/AtoN/other/basestation.svg","aton/east-beacon":"assets/svg/AtoN/cardinal/east_beacon.svg","aton/east-mark":"assets/svg/AtoN/cardinal/east_mark.svg","aton/west-beacon":"assets/svg/AtoN/cardinal/west_beacon.svg","aton/west-mark":"assets/svg/AtoN/cardinal/west_mark.svg","aton/north-beacon":"assets/svg/AtoN/cardinal/north_beacon.svg","aton/north-mark":"assets/svg/AtoN/cardinal/north_mark.svg","aton/south-beacon":"assets/svg/AtoN/cardinal/south_beacon.svg","aton/south-mark":"assets/svg/AtoN/cardinal/south_mark.svg","aton/port-beacon":"assets/svg/AtoN/lateral/port_beacon.svg","aton/starboard-beacon":"assets/svg/AtoN/lateral/starboard_beacon.svg","aton/port-preferred-beacon":"assets/svg/AtoN/lateral/port_preferred_beacon.svg","aton/starboard-preferred-beacon":"assets/svg/AtoN/lateral/starboard_preferred_beacon.svg","aton/port-mark":"assets/svg/AtoN/lateral/port_mark.svg","aton/starboard-mark":"assets/svg/AtoN/lateral/starboard_mark.svg","aton/port-preferred-mark":"assets/svg/AtoN/lateral/port_preferred_mark.svg","aton/starboard-preferred-mark":"assets/svg/AtoN/lateral/starboard_preferred_mark.svg","aton/special-beacon":"assets/svg/AtoN/special/special_beacon.svg","aton/special-mark":"assets/svg/AtoN/special/special_mark.svg","aton/safewater-beacon":"assets/svg/AtoN/dangerSafe/safewater_beacon.svg","aton/safewater-mark":"assets/svg/AtoN/dangerSafe/safewater_mark.svg","aton/isolateddanger-beacon":"assets/svg/AtoN/dangerSafe/isolateddanger_beacon.svg","aton/isolateddanger-mark":"assets/svg/AtoN/dangerSafe/isolateddanger_mark.svg","aton/unknown":"assets/svg/AtoN/other/unknown.svg"},xr={"vessel/fishing":"assets/svg/vessel/fishing.svg","vessel/diving":"assets/svg/vessel/diving-ops.svg","vessel/military":"assets/svg/vessel/military-ops.svg","vessel/sailing":"assets/svg/vessel/sailing.svg","vessel/pleasurecraft":"assets/svg/vessel/pleasurecraft.svg","vessel/highspeed":"assets/svg/vessel/highspeed.svg","vessel/pilot":"assets/svg/vessel/pilot.svg","vessel/sar":"assets/svg/vessel/sar.svg","vessel/tug":"assets/svg/vessel/tug.svg","vessel/law":"assets/svg/vessel/law-enforcement.svg","vessel/spare":"assets/svg/vessel/other.svg","vessel/passenger":"assets/svg/vessel/passenger.svg","vessel/cargo":"assets/svg/vessel/cargo.svg","vessel/tanker":"assets/svg/vessel/tanker.svg","vessel/other":"assets/svg/vessel/other.svg","vessel/unknown":"assets/svg/vessel/unknown.svg","vessel/self":"assets/svg/vessel/self.svg"},kr=Object.keys(xr),Is={"beacon/sart":"assets/svg/sar-distress-device/sart-eprib-mob.svg","beacon/mob":"assets/svg/sar-distress-device/sart-eprib-mob.svg","beacon/epirb":"assets/svg/sar-distress-device/sart-eprib-mob.svg"},As=R(R(R({},Es),xr),Is),Ds=[{code:0,key:"aton/other"},{code:1,key:"aton/other"},{code:2,key:"aton/other"},{code:3,key:"aton/other"},{code:4,key:"aton/other"},{code:5,key:"aton/other"},{code:6,key:"aton/other"},{code:7,key:"aton/other"},{code:8,key:"aton/other"},{code:9,key:"aton/north-beacon"},{code:10,key:"aton/east-beacon"},{code:11,key:"aton/south-beacon"},{code:12,key:"aton/west-beacon"},{code:13,key:"aton/port-beacon"},{code:14,key:"aton/starboard-beacon"},{code:15,key:"aton/port-preferred-beacon"},{code:16,key:"aton/starboard-preferred-beacon"},{code:17,key:"aton/isolateddanger-beacon"},{code:18,key:"aton/safewater-beacon"},{code:19,key:"aton/special-beacon"},{code:20,key:"aton/north-mark"},{code:21,key:"aton/east-mark"},{code:22,key:"aton/south-mark"},{code:23,key:"aton/west-mark"},{code:24,key:"aton/port-mark"},{code:25,key:"aton/starboard-mark"},{code:26,key:"aton/port-preferred-mark"},{code:27,key:"aton/starboard-preferred-mark"},{code:28,key:"aton/isolateddanger-mark"},{code:29,key:"aton/safewater-mark"},{code:30,key:"aton/special-mark"},{code:31,key:"aton/other"}],Ps=[{min:0,max:9,key:"vessel/other"},{min:10,max:19,key:"vessel/other"},{min:20,max:29,key:"vessel/highspeed"},{min:30,max:30,key:"vessel/fishing"},{min:31,max:31,key:"vessel/tug"},{min:32,max:32,key:"vessel/tug"},{min:33,max:33,key:"vessel/tug"},{min:34,max:34,key:"vessel/diving"},{min:35,max:35,key:"vessel/military"},{min:36,max:36,key:"vessel/sailing"},{min:37,max:37,key:"vessel/pleasurecraft"},{min:38,max:39,key:"vessel/other"},{min:40,max:49,key:"vessel/highspeed"},{min:50,max:50,key:"vessel/pilot"},{min:51,max:51,key:"vessel/sar"},{min:52,max:52,key:"vessel/tug"},{min:53,max:53,key:"vessel/tug"},{min:54,max:54,key:"vessel/tug"},{min:55,max:55,key:"vessel/law"},{min:56,max:56,key:"vessel/other"},{min:57,max:57,key:"vessel/other"},{min:58,max:58,key:"vessel/tug"},{min:59,max:59,key:"vessel/tug"},{min:60,max:69,key:"vessel/passenger"},{min:70,max:79,key:"vessel/cargo"},{min:80,max:89,key:"vessel/tanker"},{min:90,max:99,key:"vessel/other"}];function If(n){return N(this,null,function*(){let s=fr(Us(n));return Rs(Ls(n),s)})}function Af(){return N(this,null,function*(){return Os("vessel/self")})}function wr(n){return N(this,null,function*(){let s=_r.get(n);if(s)return s;let e=sa.get(n);if(e)return e;let t=As[n],i=fetch(t).then(r=>r.ok?r.text():yr).catch(r=>(console.warn("[ais-icon-registry] Icon fetch error, using fallback.",{key:n,url:t,error:r}),yr)).then(r=>(_r.set(n,r),sa.delete(n),r));return sa.set(n,i),i})}function Os(n){return N(this,null,function*(){let s=br.get(n);if(s)return s;let e=yield wr(n),t=la(e);return br.set(n,t),t})}function Fs(n,s){return N(this,null,function*(){let e=Sr(n,s),t=vr.get(e);if(t)return t;let i=yield wr(n),r=gr(i,s);return vr.set(e,r),r})}function Rs(n,s){return N(this,null,function*(){let e=Sr(n,s),t=Cr.get(e);if(t)return t;let i=yield Fs(n,s),r=la(i);return Cr.set(e,r),r})}function Sr(n,s){return`${n}|${Ns(s)}`}function Ns(n){return[da(n.fill),da(n.stroke),da(n.auraColor),zi(n.fillOpacity),zi(n.strokeOpacity),zi(n.auraOpacity),zi(n.strokeWidth),zi(n.sizePx)].join("|")}function da(n){return n??""}function zi(n){return n===void 0||!Number.isFinite(n)?"":n.toFixed(4)}function Ls(n){let s=Gs(Vs(n.mmsi));if(s)return s;switch(n.type){case"aton":return Bs(n.atonTypeId??null);case"basestation":return"aton/basestation";case"sar":return"vessel/sar";case"vessel":return zs(n.aisShipTypeId??null);default:return"vessel/unknown"}}function Vs(n){if(n==null)return null;let s=typeof n=="number"?String(n):n;return s.length?s:null}function Gs(n){return n?n.startsWith("970")?"beacon/sart":n.startsWith("972")?"beacon/mob":n.startsWith("974")?"beacon/epirb":null:null}function Bs(n){let s=typeof n=="number"&&Number.isFinite(n)?n:null,t=(s===null?void 0:Ds.find(i=>i.code===s))?.key??"aton/unknown";return t}function zs(n){if(n!==null){for(let s of Ps)if(n>=s.min&&n<=s.max)return s.key}return"vessel/other"}function Us(n){let s=$s(n.navState),e=n.targetKind??(s?"fixed":Ws(n.type)),t=n.status==="unconfirmed"||n.status==="lost"?"unconfirmed":"confirmed";return R({targetKind:e,targetState:t,isStationary:s,collisionRiskRating:n.collisionRiskRating},n.themeOverrides)}function Ws(n){switch(n){case"aton":case"basestation":return"fixed";default:return"moving"}}function $s(n){let s=qs(n);if(s!==void 0)return s===1||s===5;let e=Hs(n);return e?e.includes("moored")||e.includes("anchored")||e.includes("at anchor"):!1}function qs(n){if(typeof n=="number"&&Number.isFinite(n))return n;if(typeof n=="string"){let s=n.trim();if(!s.length)return;let e=Number(s);return Number.isFinite(e)?e:void 0}}function Hs(n){if(typeof n!="string")return;let s=n.trim().toLowerCase();return s.length?s.replace(/\s+/g," "):void 0}var ha=["*"];function js(n,s){n&1&&re(0)}var Ks=["tabListContainer"],Qs=["tabList"],Ys=["tabListInner"],Zs=["nextPaginator"],Xs=["previousPaginator"],Js=["content"];function ed(n,s){}var td=["tabBodyWrapper"],id=["tabHeader"];function nd(n,s){}function ad(n,s){if(n&1&&ze(0,nd,0,0,"ng-template",12),n&2){let e=u().$implicit;g("cdkPortalOutlet",e.templateLabel)}}function od(n,s){if(n&1&&l(0),n&2){let e=u().$implicit;v(e.textLabel)}}function rd(n,s){if(n&1){let e=P();o(0,"div",7,2),C("click",function(){let i=y(e),r=i.$implicit,c=i.$index,p=u(),_=Y(1);return x(p._handleClick(r,_,c))})("cdkFocusChange",function(i){let r=y(e).$index,c=u();return x(c._tabFocusChanged(i,r))}),b(2,"span",8)(3,"div",9),o(4,"span",10)(5,"span",11),h(6,ad,1,1,null,12)(7,od,1,1),a()()()}if(n&2){let e=s.$implicit,t=s.$index,i=Y(1),r=u();Ue(e.labelClass),G("mdc-tab--active",r.selectedIndex===t),g("id",r._getTabLabelId(e,t))("disabled",e.disabled)("fitInkBarToContent",r.fitInkBarToContent),$("tabIndex",r._getTabIndex(t))("aria-posinset",t+1)("aria-setsize",r._tabs.length)("aria-controls",r._getTabContentId(t))("aria-selected",r.selectedIndex===t)("aria-label",e.ariaLabel||null)("aria-labelledby",!e.ariaLabel&&e.ariaLabelledby?e.ariaLabelledby:null),d(3),g("matRippleTrigger",i)("matRippleDisabled",e.disabled||r.disableRipple),d(3),f(e.templateLabel?6:7)}}function ld(n,s){n&1&&re(0)}function sd(n,s){if(n&1){let e=P();o(0,"mat-tab-body",13),C("_onCentered",function(){y(e);let i=u();return x(i._removeTabBodyWrapperHeight())})("_onCentering",function(i){y(e);let r=u();return x(r._setTabBodyWrapperHeight(i))})("_beforeCentering",function(i){y(e);let r=u();return x(r._bodyCentered(i))}),a()}if(n&2){let e=s.$implicit,t=s.$index,i=u();Ue(e.bodyClass),g("id",i._getTabContentId(t))("content",e.content)("position",e.position)("animationDuration",i.animationDuration)("preserveContent",i.preserveContent),$("tabindex",i.contentTabIndex!=null&&i.selectedIndex===t?i.contentTabIndex:null)("aria-labelledby",i._getTabLabelId(e,t))("aria-hidden",i.selectedIndex!==t)}}var dd=new H("MatTabContent"),cd=(()=>{class n{template=m(pi);constructor(){}static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,selectors:[["","matTabContent",""]],features:[ve([{provide:dd,useExisting:n}])]})}return n})(),md=new H("MatTabLabel"),Ir=new H("MAT_TAB"),fa=(()=>{class n extends yo{_closestTab=m(Ir,{optional:!0});static \u0275fac=(()=>{let e;return function(i){return(e||(e=Qi(n)))(i||n)}})();static \u0275dir=pe({type:n,selectors:[["","mat-tab-label",""],["","matTabLabel",""]],features:[ve([{provide:md,useExisting:n}]),Ai]})}return n})(),Ar=new H("MAT_TAB_GROUP"),ga=(()=>{class n{_viewContainerRef=m(Yi);_closestTabGroup=m(Ar,{optional:!0});disabled=!1;get templateLabel(){return this._templateLabel}set templateLabel(e){this._setTemplateLabelInput(e)}_templateLabel;_explicitContent=void 0;_implicitContent;textLabel="";ariaLabel;ariaLabelledby;labelClass;bodyClass;id=null;_contentPortal=null;get content(){return this._contentPortal}_stateChanges=new me;position=null;origin=null;isActive=!1;constructor(){m(st).load($t)}ngOnChanges(e){(e.hasOwnProperty("textLabel")||e.hasOwnProperty("disabled"))&&this._stateChanges.next()}ngOnDestroy(){this._stateChanges.complete()}ngOnInit(){this._contentPortal=new ln(this._explicitContent||this._implicitContent,this._viewContainerRef)}_setTemplateLabelInput(e){e&&e._closestTab===this&&(this._templateLabel=e)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["mat-tab"]],contentQueries:function(t,i,r){if(t&1&&lt(r,fa,5)(r,cd,7,pi),t&2){let c;O(c=F())&&(i.templateLabel=c.first),O(c=F())&&(i._explicitContent=c.first)}},viewQuery:function(t,i){if(t&1&&Pe(pi,7),t&2){let r;O(r=F())&&(i._implicitContent=r.first)}},hostAttrs:["hidden",""],hostVars:1,hostBindings:function(t,i){t&2&&$("id",null)},inputs:{disabled:[2,"disabled","disabled",D],textLabel:[0,"label","textLabel"],ariaLabel:[0,"aria-label","ariaLabel"],ariaLabelledby:[0,"aria-labelledby","ariaLabelledby"],labelClass:"labelClass",bodyClass:"bodyClass",id:"id"},exportAs:["matTab"],features:[ve([{provide:Ir,useExisting:n}]),Ge],ngContentSelectors:ha,decls:1,vars:0,template:function(t,i){t&1&&(Ne(),Zi(0,js,1,0,"ng-template"))},encapsulation:2})}return n})(),ca="mdc-tab-indicator--active",Mr="mdc-tab-indicator--no-transition",ma=class{_items;_currentItem;constructor(s){this._items=s}hide(){this._items.forEach(s=>s.deactivateInkBar()),this._currentItem=void 0}alignToElement(s){let e=this._items.find(i=>i.elementRef.nativeElement===s),t=this._currentItem;if(e!==t&&(t?.deactivateInkBar(),e)){let i=t?.elementRef.nativeElement.getBoundingClientRect?.();e.activateInkBar(i),this._currentItem=e}}},pd=(()=>{class n{_elementRef=m(X);_inkBarElement=null;_inkBarContentElement=null;_fitToContent=!1;get fitInkBarToContent(){return this._fitToContent}set fitInkBarToContent(e){this._fitToContent!==e&&(this._fitToContent=e,this._inkBarElement&&this._appendInkBarElement())}activateInkBar(e){let t=this._elementRef.nativeElement;if(!e||!t.getBoundingClientRect||!this._inkBarContentElement){t.classList.add(ca);return}let i=t.getBoundingClientRect(),r=e.width/i.width,c=e.left-i.left;t.classList.add(Mr),this._inkBarContentElement.style.setProperty("transform",`translateX(${c}px) scaleX(${r})`),t.getBoundingClientRect(),t.classList.remove(Mr),t.classList.add(ca),this._inkBarContentElement.style.setProperty("transform","")}deactivateInkBar(){this._elementRef.nativeElement.classList.remove(ca)}ngOnInit(){this._createInkBarElement()}ngOnDestroy(){this._inkBarElement?.remove(),this._inkBarElement=this._inkBarContentElement=null}_createInkBarElement(){let e=this._elementRef.nativeElement.ownerDocument||document,t=this._inkBarElement=e.createElement("span"),i=this._inkBarContentElement=e.createElement("span");t.className="mdc-tab-indicator",i.className="mdc-tab-indicator__content mdc-tab-indicator__content--underline",t.appendChild(this._inkBarContentElement),this._appendInkBarElement()}_appendInkBarElement(){this._inkBarElement;let e=this._fitToContent?this._elementRef.nativeElement.querySelector(".mdc-tab__content"):this._elementRef.nativeElement;e.appendChild(this._inkBarElement)}static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,inputs:{fitInkBarToContent:[2,"fitInkBarToContent","fitInkBarToContent",D]}})}return n})();var Dr=(()=>{class n extends pd{elementRef=m(X);disabled=!1;focus(){this.elementRef.nativeElement.focus()}getOffsetLeft(){return this.elementRef.nativeElement.offsetLeft}getOffsetWidth(){return this.elementRef.nativeElement.offsetWidth}static \u0275fac=(()=>{let e;return function(i){return(e||(e=Qi(n)))(i||n)}})();static \u0275dir=pe({type:n,selectors:[["","matTabLabelWrapper",""]],hostVars:3,hostBindings:function(t,i){t&2&&($("aria-disabled",!!i.disabled),G("mat-mdc-tab-disabled",i.disabled))},inputs:{disabled:[2,"disabled","disabled",D]},features:[Ai]})}return n})(),Tr={passive:!0},ud=650,hd=100,fd=(()=>{class n{_elementRef=m(X);_changeDetectorRef=m(Oe);_viewportRuler=m(ui);_dir=m(Dt,{optional:!0});_ngZone=m(ae);_platform=m(ht);_sharedResizeObserver=m(In);_injector=m(_t);_renderer=m(Be);_animationsDisabled=Ie();_eventCleanups;_scrollDistance=0;_selectedIndexChanged=!1;_destroyed=new me;_showPaginationControls=!1;_disableScrollAfter=!0;_disableScrollBefore=!0;_tabLabelCount;_scrollDistanceChanged=!1;_keyManager;_currentTextContent;_stopScrolling=new me;disablePagination=!1;get selectedIndex(){return this._selectedIndex}set selectedIndex(e){let t=isNaN(e)?0:e;this._selectedIndex!=t&&(this._selectedIndexChanged=!0,this._selectedIndex=t,this._keyManager&&this._keyManager.updateActiveItem(t))}_selectedIndex=0;selectFocusedIndex=new j;indexFocused=new j;constructor(){this._eventCleanups=this._ngZone.runOutsideAngular(()=>[this._renderer.listen(this._elementRef.nativeElement,"mouseleave",()=>this._stopInterval())])}ngAfterViewInit(){this._eventCleanups.push(this._renderer.listen(this._previousPaginator.nativeElement,"touchstart",()=>this._handlePaginatorPress("before"),Tr),this._renderer.listen(this._nextPaginator.nativeElement,"touchstart",()=>this._handlePaginatorPress("after"),Tr))}ngAfterContentInit(){let e=this._dir?this._dir.change:Ei("ltr"),t=this._sharedResizeObserver.observe(this._elementRef.nativeElement).pipe(Lt(32),Qe(this._destroyed)),i=this._viewportRuler.change(150).pipe(Qe(this._destroyed)),r=()=>{this.updatePagination(),this._alignInkBarToSelectedTab()};this._keyManager=new _o(this._items).withHorizontalOrientation(this._getLayoutDirection()).withHomeAndEnd().withWrap().skipPredicate(()=>!1),this._keyManager.updateActiveItem(Math.max(this._selectedIndex,0)),Bt(r,{injector:this._injector}),De(e,i,t,this._items.changes,this._itemsResized()).pipe(Qe(this._destroyed)).subscribe(()=>{this._ngZone.run(()=>{Promise.resolve().then(()=>{this._scrollDistance=Math.max(0,Math.min(this._getMaxScrollDistance(),this._scrollDistance)),r()})}),this._keyManager?.withHorizontalOrientation(this._getLayoutDirection())}),this._keyManager.change.subscribe(c=>{this.indexFocused.emit(c),this._setTabFocus(c)})}_itemsResized(){return typeof ResizeObserver!="function"?ci:this._items.changes.pipe(Ke(this._items),Et(e=>new ni(t=>this._ngZone.runOutsideAngular(()=>{let i=new ResizeObserver(r=>t.next(r));return e.forEach(r=>i.observe(r.elementRef.nativeElement)),()=>{i.disconnect()}}))),Ra(1),rt(e=>e.some(t=>t.contentRect.width>0&&t.contentRect.height>0)))}ngAfterContentChecked(){this._tabLabelCount!=this._items.length&&(this.updatePagination(),this._tabLabelCount=this._items.length,this._changeDetectorRef.markForCheck()),this._selectedIndexChanged&&(this._scrollToLabel(this._selectedIndex),this._checkScrollingControls(),this._alignInkBarToSelectedTab(),this._selectedIndexChanged=!1,this._changeDetectorRef.markForCheck()),this._scrollDistanceChanged&&(this._updateTabScrollPosition(),this._scrollDistanceChanged=!1,this._changeDetectorRef.markForCheck())}ngOnDestroy(){this._eventCleanups.forEach(e=>e()),this._keyManager?.destroy(),this._destroyed.next(),this._destroyed.complete(),this._stopScrolling.complete()}_handleKeydown(e){if(!vt(e))switch(e.keyCode){case 13:case 32:if(this.focusIndex!==this.selectedIndex){let t=this._items.get(this.focusIndex);t&&!t.disabled&&(this.selectFocusedIndex.emit(this.focusIndex),this._itemSelected(e))}break;default:this._keyManager?.onKeydown(e)}}_onContentChanges(){let e=this._elementRef.nativeElement.textContent;e!==this._currentTextContent&&(this._currentTextContent=e||"",this._ngZone.run(()=>{this.updatePagination(),this._alignInkBarToSelectedTab(),this._changeDetectorRef.markForCheck()}))}updatePagination(){this._checkPaginationEnabled(),this._checkScrollingControls(),this._updateTabScrollPosition()}get focusIndex(){return this._keyManager?this._keyManager.activeItemIndex:0}set focusIndex(e){!this._isValidIndex(e)||this.focusIndex===e||!this._keyManager||this._keyManager.setActiveItem(e)}_isValidIndex(e){return this._items?!!this._items.toArray()[e]:!0}_setTabFocus(e){if(this._showPaginationControls&&this._scrollToLabel(e),this._items&&this._items.length){this._items.toArray()[e].focus();let t=this._tabListContainer.nativeElement;this._getLayoutDirection()=="ltr"?t.scrollLeft=0:t.scrollLeft=t.scrollWidth-t.offsetWidth}}_getLayoutDirection(){return this._dir&&this._dir.value==="rtl"?"rtl":"ltr"}_updateTabScrollPosition(){if(this.disablePagination)return;let e=this.scrollDistance,t=this._getLayoutDirection()==="ltr"?-e:e;this._tabList.nativeElement.style.transform=`translateX(${Math.round(t)}px)`,(this._platform.TRIDENT||this._platform.EDGE)&&(this._tabListContainer.nativeElement.scrollLeft=0)}get scrollDistance(){return this._scrollDistance}set scrollDistance(e){this._scrollTo(e)}_scrollHeader(e){let t=this._tabListContainer.nativeElement.offsetWidth,i=(e=="before"?-1:1)*t/3;return this._scrollTo(this._scrollDistance+i)}_handlePaginatorClick(e){this._stopInterval(),this._scrollHeader(e)}_scrollToLabel(e){if(this.disablePagination)return;let t=this._items?this._items.toArray()[e]:null;if(!t)return;let i=this._tabListContainer.nativeElement.offsetWidth,{offsetLeft:r,offsetWidth:c}=t.elementRef.nativeElement,p,_;this._getLayoutDirection()=="ltr"?(p=r,_=p+c):(_=this._tabListInner.nativeElement.offsetWidth-r,p=_-c);let k=this.scrollDistance,w=this.scrollDistance+i;p<k?this.scrollDistance-=k-p:_>w&&(this.scrollDistance+=Math.min(_-w,p-k))}_checkPaginationEnabled(){if(this.disablePagination)this._showPaginationControls=!1;else{let e=this._tabListInner.nativeElement.scrollWidth,t=this._elementRef.nativeElement.offsetWidth,i=e-t>=5;i||(this.scrollDistance=0),i!==this._showPaginationControls&&(this._showPaginationControls=i,this._changeDetectorRef.markForCheck())}}_checkScrollingControls(){this.disablePagination?this._disableScrollAfter=this._disableScrollBefore=!0:(this._disableScrollBefore=this.scrollDistance==0,this._disableScrollAfter=this.scrollDistance==this._getMaxScrollDistance(),this._changeDetectorRef.markForCheck())}_getMaxScrollDistance(){let e=this._tabListInner.nativeElement.scrollWidth,t=this._tabListContainer.nativeElement.offsetWidth;return e-t||0}_alignInkBarToSelectedTab(){let e=this._items&&this._items.length?this._items.toArray()[this.selectedIndex]:null,t=e?e.elementRef.nativeElement:null;t?this._inkBar.alignToElement(t):this._inkBar.hide()}_stopInterval(){this._stopScrolling.next()}_handlePaginatorPress(e,t){t&&t.button!=null&&t.button!==0||(this._stopInterval(),Ii(ud,hd).pipe(Qe(De(this._stopScrolling,this._destroyed))).subscribe(()=>{let{maxScrollDistance:i,distance:r}=this._scrollHeader(e);(r===0||r>=i)&&this._stopInterval()}))}_scrollTo(e){if(this.disablePagination)return{maxScrollDistance:0,distance:0};let t=this._getMaxScrollDistance();return this._scrollDistance=Math.max(0,Math.min(t,e)),this._scrollDistanceChanged=!0,this._checkScrollingControls(),{maxScrollDistance:t,distance:this._scrollDistance}}static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,inputs:{disablePagination:[2,"disablePagination","disablePagination",D],selectedIndex:[2,"selectedIndex","selectedIndex",Ze]},outputs:{selectFocusedIndex:"selectFocusedIndex",indexFocused:"indexFocused"}})}return n})(),gd=(()=>{class n extends fd{_items;_tabListContainer;_tabList;_tabListInner;_nextPaginator;_previousPaginator;_inkBar;ariaLabel;ariaLabelledby;disableRipple=!1;ngAfterContentInit(){this._inkBar=new ma(this._items),super.ngAfterContentInit()}_itemSelected(e){e.preventDefault()}static \u0275fac=(()=>{let e;return function(i){return(e||(e=Qi(n)))(i||n)}})();static \u0275cmp=E({type:n,selectors:[["mat-tab-header"]],contentQueries:function(t,i,r){if(t&1&&lt(r,Dr,4),t&2){let c;O(c=F())&&(i._items=c)}},viewQuery:function(t,i){if(t&1&&Pe(Ks,7)(Qs,7)(Ys,7)(Zs,5)(Xs,5),t&2){let r;O(r=F())&&(i._tabListContainer=r.first),O(r=F())&&(i._tabList=r.first),O(r=F())&&(i._tabListInner=r.first),O(r=F())&&(i._nextPaginator=r.first),O(r=F())&&(i._previousPaginator=r.first)}},hostAttrs:[1,"mat-mdc-tab-header"],hostVars:4,hostBindings:function(t,i){t&2&&G("mat-mdc-tab-header-pagination-controls-enabled",i._showPaginationControls)("mat-mdc-tab-header-rtl",i._getLayoutDirection()=="rtl")},inputs:{ariaLabel:[0,"aria-label","ariaLabel"],ariaLabelledby:[0,"aria-labelledby","ariaLabelledby"],disableRipple:[2,"disableRipple","disableRipple",D]},features:[Ai],ngContentSelectors:ha,decls:13,vars:10,consts:[["previousPaginator",""],["tabListContainer",""],["tabList",""],["tabListInner",""],["nextPaginator",""],["mat-ripple","",1,"mat-mdc-tab-header-pagination","mat-mdc-tab-header-pagination-before",3,"click","mousedown","touchend","matRippleDisabled"],[1,"mat-mdc-tab-header-pagination-chevron"],[1,"mat-mdc-tab-label-container",3,"keydown"],["role","tablist",1,"mat-mdc-tab-list",3,"cdkObserveContent"],[1,"mat-mdc-tab-labels"],["mat-ripple","",1,"mat-mdc-tab-header-pagination","mat-mdc-tab-header-pagination-after",3,"mousedown","click","touchend","matRippleDisabled"]],template:function(t,i){t&1&&(Ne(),o(0,"div",5,0),C("click",function(){return i._handlePaginatorClick("before")})("mousedown",function(c){return i._handlePaginatorPress("before",c)})("touchend",function(){return i._stopInterval()}),b(2,"div",6),a(),o(3,"div",7,1),C("keydown",function(c){return i._handleKeydown(c)}),o(5,"div",8,2),C("cdkObserveContent",function(){return i._onContentChanges()}),o(7,"div",9,3),re(9),a()()(),o(10,"div",10,4),C("mousedown",function(c){return i._handlePaginatorPress("after",c)})("click",function(){return i._handlePaginatorClick("after")})("touchend",function(){return i._stopInterval()}),b(12,"div",6),a()),t&2&&(G("mat-mdc-tab-header-pagination-disabled",i._disableScrollBefore),g("matRippleDisabled",i._disableScrollBefore||i.disableRipple),d(3),G("_mat-animation-noopable",i._animationsDisabled),d(2),$("aria-label",i.ariaLabel||null)("aria-labelledby",i.ariaLabelledby||null),d(5),G("mat-mdc-tab-header-pagination-disabled",i._disableScrollAfter),g("matRippleDisabled",i._disableScrollAfter||i.disableRipple))},dependencies:[Pt,po],styles:[`.mat-mdc-tab-header {
  display: flex;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

.mdc-tab-indicator .mdc-tab-indicator__content {
  transition-duration: var(--mat-tab-animation-duration, 250ms);
}

.mat-mdc-tab-header-pagination {
  -webkit-user-select: none;
  user-select: none;
  position: relative;
  display: none;
  justify-content: center;
  align-items: center;
  min-width: 32px;
  cursor: pointer;
  z-index: 2;
  -webkit-tap-highlight-color: transparent;
  touch-action: none;
  box-sizing: content-box;
  outline: 0;
}
.mat-mdc-tab-header-pagination::-moz-focus-inner {
  border: 0;
}
.mat-mdc-tab-header-pagination .mat-ripple-element {
  opacity: 0.12;
  background-color: var(--mat-tab-inactive-ripple-color, var(--mat-sys-on-surface));
}
.mat-mdc-tab-header-pagination-controls-enabled .mat-mdc-tab-header-pagination {
  display: flex;
}

.mat-mdc-tab-header-pagination-before,
.mat-mdc-tab-header-rtl .mat-mdc-tab-header-pagination-after {
  padding-left: 4px;
}
.mat-mdc-tab-header-pagination-before .mat-mdc-tab-header-pagination-chevron,
.mat-mdc-tab-header-rtl .mat-mdc-tab-header-pagination-after .mat-mdc-tab-header-pagination-chevron {
  transform: rotate(-135deg);
}

.mat-mdc-tab-header-rtl .mat-mdc-tab-header-pagination-before,
.mat-mdc-tab-header-pagination-after {
  padding-right: 4px;
}
.mat-mdc-tab-header-rtl .mat-mdc-tab-header-pagination-before .mat-mdc-tab-header-pagination-chevron,
.mat-mdc-tab-header-pagination-after .mat-mdc-tab-header-pagination-chevron {
  transform: rotate(45deg);
}

.mat-mdc-tab-header-pagination-chevron {
  border-style: solid;
  border-width: 2px 2px 0 0;
  height: 8px;
  width: 8px;
  border-color: var(--mat-tab-pagination-icon-color, var(--mat-sys-on-surface));
}

.mat-mdc-tab-header-pagination-disabled {
  box-shadow: none;
  cursor: default;
  pointer-events: none;
}
.mat-mdc-tab-header-pagination-disabled .mat-mdc-tab-header-pagination-chevron {
  opacity: 0.4;
}

.mat-mdc-tab-list {
  flex-grow: 1;
  position: relative;
  transition: transform 500ms cubic-bezier(0.35, 0, 0.25, 1);
}
._mat-animation-noopable .mat-mdc-tab-list {
  transition: none;
}

.mat-mdc-tab-label-container {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
  z-index: 1;
  border-bottom-style: solid;
  border-bottom-width: var(--mat-tab-divider-height, 1px);
  border-bottom-color: var(--mat-tab-divider-color, var(--mat-sys-surface-variant));
}
.mat-mdc-tab-group-inverted-header .mat-mdc-tab-label-container {
  border-bottom: none;
  border-top-style: solid;
  border-top-width: var(--mat-tab-divider-height, 1px);
  border-top-color: var(--mat-tab-divider-color, var(--mat-sys-surface-variant));
}

.mat-mdc-tab-labels {
  display: flex;
  flex: 1 0 auto;
}
[mat-align-tabs=center] > .mat-mdc-tab-header .mat-mdc-tab-labels {
  justify-content: center;
}
[mat-align-tabs=end] > .mat-mdc-tab-header .mat-mdc-tab-labels {
  justify-content: flex-end;
}
.cdk-drop-list .mat-mdc-tab-labels, .mat-mdc-tab-labels.cdk-drop-list {
  min-height: var(--mat-tab-container-height, 48px);
}

.mat-mdc-tab::before {
  margin: 5px;
}
@media (forced-colors: active) {
  .mat-mdc-tab[aria-disabled=true] {
    color: GrayText;
  }
}
`],encapsulation:2})}return n})(),_d=new H("MAT_TABS_CONFIG"),Er=(()=>{class n extends Xn{_host=m(pa);_ngZone=m(ae);_centeringSub=nt.EMPTY;_leavingSub=nt.EMPTY;constructor(){super()}ngOnInit(){super.ngOnInit(),this._centeringSub=this._host._beforeCentering.pipe(Ke(this._host._isCenterPosition())).subscribe(e=>{this._host._content&&e&&!this.hasAttached()&&this._ngZone.run(()=>{Promise.resolve().then(),this.attach(this._host._content)})}),this._leavingSub=this._host._afterLeavingCenter.subscribe(()=>{this._host.preserveContent||this._ngZone.run(()=>this.detach())})}ngOnDestroy(){super.ngOnDestroy(),this._centeringSub.unsubscribe(),this._leavingSub.unsubscribe()}static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,selectors:[["","matTabBodyHost",""]],features:[Ai]})}return n})(),pa=(()=>{class n{_elementRef=m(X);_dir=m(Dt,{optional:!0});_ngZone=m(ae);_injector=m(_t);_renderer=m(Be);_diAnimationsDisabled=Ie();_eventCleanups;_initialized=!1;_fallbackTimer;_positionIndex;_dirChangeSubscription=nt.EMPTY;_position;_previousPosition;_onCentering=new j;_beforeCentering=new j;_afterLeavingCenter=new j;_onCentered=new j(!0);_portalHost;_contentElement;_content;animationDuration="500ms";preserveContent=!1;set position(e){this._positionIndex=e,this._computePositionAnimationState()}constructor(){if(this._dir){let e=m(Oe);this._dirChangeSubscription=this._dir.change.subscribe(t=>{this._computePositionAnimationState(t),e.markForCheck()})}}ngOnInit(){this._bindTransitionEvents(),this._position==="center"&&(this._setActiveClass(!0),Bt(()=>this._onCentering.emit(this._elementRef.nativeElement.clientHeight),{injector:this._injector})),this._initialized=!0}ngOnDestroy(){clearTimeout(this._fallbackTimer),this._eventCleanups?.forEach(e=>e()),this._dirChangeSubscription.unsubscribe()}_bindTransitionEvents(){this._ngZone.runOutsideAngular(()=>{let e=this._elementRef.nativeElement,t=i=>{i.target===this._contentElement?.nativeElement&&(this._elementRef.nativeElement.classList.remove("mat-tab-body-animating"),i.type==="transitionend"&&this._transitionDone())};this._eventCleanups=[this._renderer.listen(e,"transitionstart",i=>{i.target===this._contentElement?.nativeElement&&(this._elementRef.nativeElement.classList.add("mat-tab-body-animating"),this._transitionStarted())}),this._renderer.listen(e,"transitionend",t),this._renderer.listen(e,"transitioncancel",t)]})}_transitionStarted(){clearTimeout(this._fallbackTimer);let e=this._position==="center";this._beforeCentering.emit(e),e&&this._onCentering.emit(this._elementRef.nativeElement.clientHeight)}_transitionDone(){this._position==="center"?this._onCentered.emit():this._previousPosition==="center"&&this._afterLeavingCenter.emit()}_setActiveClass(e){this._elementRef.nativeElement.classList.toggle("mat-mdc-tab-body-active",e)}_getLayoutDirection(){return this._dir&&this._dir.value==="rtl"?"rtl":"ltr"}_isCenterPosition(){return this._positionIndex===0}_computePositionAnimationState(e=this._getLayoutDirection()){this._previousPosition=this._position,this._positionIndex<0?this._position=e=="ltr"?"left":"right":this._positionIndex>0?this._position=e=="ltr"?"right":"left":this._position="center",this._animationsDisabled()?this._simulateTransitionEvents():this._initialized&&(this._position==="center"||this._previousPosition==="center")&&(clearTimeout(this._fallbackTimer),this._fallbackTimer=this._ngZone.runOutsideAngular(()=>setTimeout(()=>this._simulateTransitionEvents(),100)))}_simulateTransitionEvents(){this._transitionStarted(),Bt(()=>this._transitionDone(),{injector:this._injector})}_animationsDisabled(){return this._diAnimationsDisabled||this.animationDuration==="0ms"||this.animationDuration==="0s"}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["mat-tab-body"]],viewQuery:function(t,i){if(t&1&&Pe(Er,5)(Js,5),t&2){let r;O(r=F())&&(i._portalHost=r.first),O(r=F())&&(i._contentElement=r.first)}},hostAttrs:[1,"mat-mdc-tab-body"],hostVars:1,hostBindings:function(t,i){t&2&&$("inert",i._position==="center"?null:"")},inputs:{_content:[0,"content","_content"],animationDuration:"animationDuration",preserveContent:"preserveContent",position:"position"},outputs:{_onCentering:"_onCentering",_beforeCentering:"_beforeCentering",_onCentered:"_onCentered"},decls:3,vars:6,consts:[["content",""],["cdkScrollable","",1,"mat-mdc-tab-body-content"],["matTabBodyHost",""]],template:function(t,i){t&1&&(o(0,"div",1,0),ze(2,ed,0,0,"ng-template",2),a()),t&2&&G("mat-tab-body-content-left",i._position==="left")("mat-tab-body-content-right",i._position==="right")("mat-tab-body-content-can-animate",i._position==="center"||i._previousPosition==="center")},dependencies:[Er,Co],styles:[`.mat-mdc-tab-body {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  display: block;
  overflow: hidden;
  outline: 0;
  flex-basis: 100%;
}
.mat-mdc-tab-body.mat-mdc-tab-body-active {
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  z-index: 1;
  flex-grow: 1;
}
.mat-mdc-tab-group.mat-mdc-tab-group-dynamic-height .mat-mdc-tab-body.mat-mdc-tab-body-active {
  overflow-y: hidden;
}

.mat-mdc-tab-body-content {
  height: 100%;
  overflow: auto;
  transform: none;
  visibility: hidden;
}
.mat-tab-body-animating > .mat-mdc-tab-body-content, .mat-mdc-tab-body-active > .mat-mdc-tab-body-content {
  visibility: visible;
}
.mat-tab-body-animating > .mat-mdc-tab-body-content {
  min-height: 1px;
}
.mat-mdc-tab-group-dynamic-height .mat-mdc-tab-body-content {
  overflow: hidden;
}

.mat-tab-body-content-can-animate {
  transition: transform var(--mat-tab-animation-duration) 1ms cubic-bezier(0.35, 0, 0.25, 1);
}
.mat-mdc-tab-body-wrapper._mat-animation-noopable .mat-tab-body-content-can-animate {
  transition: none;
}

.mat-tab-body-content-left {
  transform: translate3d(-100%, 0, 0);
}

.mat-tab-body-content-right {
  transform: translate3d(100%, 0, 0);
}
`],encapsulation:2})}return n})(),Pr=(()=>{class n{_elementRef=m(X);_changeDetectorRef=m(Oe);_ngZone=m(ae);_tabsSubscription=nt.EMPTY;_tabLabelSubscription=nt.EMPTY;_tabBodySubscription=nt.EMPTY;_diAnimationsDisabled=Ie();_allTabs;_tabBodies;_tabBodyWrapper;_tabHeader;_tabs=new Va;_indexToSelect=0;_lastFocusedTabIndex=null;_tabBodyWrapperHeight=0;color;get fitInkBarToContent(){return this._fitInkBarToContent}set fitInkBarToContent(e){this._fitInkBarToContent=e,this._changeDetectorRef.markForCheck()}_fitInkBarToContent=!1;stretchTabs=!0;alignTabs=null;dynamicHeight=!1;get selectedIndex(){return this._selectedIndex}set selectedIndex(e){this._indexToSelect=isNaN(e)?null:e}_selectedIndex=null;headerPosition="above";get animationDuration(){return this._animationDuration}set animationDuration(e){let t=e+"";this._animationDuration=/^\d+$/.test(t)?e+"ms":t}_animationDuration;get contentTabIndex(){return this._contentTabIndex}set contentTabIndex(e){this._contentTabIndex=isNaN(e)?null:e}_contentTabIndex=null;disablePagination=!1;disableRipple=!1;preserveContent=!1;get backgroundColor(){return this._backgroundColor}set backgroundColor(e){let t=this._elementRef.nativeElement.classList;t.remove("mat-tabs-with-background",`mat-background-${this.backgroundColor}`),e&&t.add("mat-tabs-with-background",`mat-background-${e}`),this._backgroundColor=e}_backgroundColor;ariaLabel;ariaLabelledby;selectedIndexChange=new j;focusChange=new j;animationDone=new j;selectedTabChange=new j(!0);_groupId;_isServer=!m(ht).isBrowser;constructor(){let e=m(_d,{optional:!0});this._groupId=m(ye).getId("mat-tab-group-"),this.animationDuration=e&&e.animationDuration?e.animationDuration:"500ms",this.disablePagination=e&&e.disablePagination!=null?e.disablePagination:!1,this.dynamicHeight=e&&e.dynamicHeight!=null?e.dynamicHeight:!1,e?.contentTabIndex!=null&&(this.contentTabIndex=e.contentTabIndex),this.preserveContent=!!e?.preserveContent,this.fitInkBarToContent=e&&e.fitInkBarToContent!=null?e.fitInkBarToContent:!1,this.stretchTabs=e&&e.stretchTabs!=null?e.stretchTabs:!0,this.alignTabs=e&&e.alignTabs!=null?e.alignTabs:null}ngAfterContentChecked(){let e=this._indexToSelect=this._clampTabIndex(this._indexToSelect);if(this._selectedIndex!=e){let t=this._selectedIndex==null;if(!t){this.selectedTabChange.emit(this._createChangeEvent(e));let i=this._tabBodyWrapper.nativeElement;i.style.minHeight=i.clientHeight+"px"}Promise.resolve().then(()=>{this._tabs.forEach((i,r)=>i.isActive=r===e),t||(this.selectedIndexChange.emit(e),this._tabBodyWrapper.nativeElement.style.minHeight="")})}this._tabs.forEach((t,i)=>{t.position=i-e,this._selectedIndex!=null&&t.position==0&&!t.origin&&(t.origin=e-this._selectedIndex)}),this._selectedIndex!==e&&(this._selectedIndex=e,this._lastFocusedTabIndex=null,this._changeDetectorRef.markForCheck())}ngAfterContentInit(){this._subscribeToAllTabChanges(),this._subscribeToTabLabels(),this._tabsSubscription=this._tabs.changes.subscribe(()=>{let e=this._clampTabIndex(this._indexToSelect);if(e===this._selectedIndex){let t=this._tabs.toArray(),i;for(let r=0;r<t.length;r++)if(t[r].isActive){this._indexToSelect=this._selectedIndex=r,this._lastFocusedTabIndex=null,i=t[r];break}!i&&t[e]&&Promise.resolve().then(()=>{t[e].isActive=!0,this.selectedTabChange.emit(this._createChangeEvent(e))})}this._changeDetectorRef.markForCheck()})}ngAfterViewInit(){this._tabBodySubscription=this._tabBodies.changes.subscribe(()=>this._bodyCentered(!0))}_subscribeToAllTabChanges(){this._allTabs.changes.pipe(Ke(this._allTabs)).subscribe(e=>{this._tabs.reset(e.filter(t=>t._closestTabGroup===this||!t._closestTabGroup)),this._tabs.notifyOnChanges()})}ngOnDestroy(){this._tabs.destroy(),this._tabsSubscription.unsubscribe(),this._tabLabelSubscription.unsubscribe(),this._tabBodySubscription.unsubscribe()}realignInkBar(){this._tabHeader&&this._tabHeader._alignInkBarToSelectedTab()}updatePagination(){this._tabHeader&&this._tabHeader.updatePagination()}focusTab(e){let t=this._tabHeader;t&&(t.focusIndex=e)}_focusChanged(e){this._lastFocusedTabIndex=e,this.focusChange.emit(this._createChangeEvent(e))}_createChangeEvent(e){let t=new ua;return t.index=e,this._tabs&&this._tabs.length&&(t.tab=this._tabs.toArray()[e]),t}_subscribeToTabLabels(){this._tabLabelSubscription&&this._tabLabelSubscription.unsubscribe(),this._tabLabelSubscription=De(...this._tabs.map(e=>e._stateChanges)).subscribe(()=>this._changeDetectorRef.markForCheck())}_clampTabIndex(e){return Math.min(this._tabs.length-1,Math.max(e||0,0))}_getTabLabelId(e,t){return e.id||`${this._groupId}-label-${t}`}_getTabContentId(e){return`${this._groupId}-content-${e}`}_setTabBodyWrapperHeight(e){if(!this.dynamicHeight||!this._tabBodyWrapperHeight){this._tabBodyWrapperHeight=e;return}let t=this._tabBodyWrapper.nativeElement;t.style.height=this._tabBodyWrapperHeight+"px",this._tabBodyWrapper.nativeElement.offsetHeight&&(t.style.height=e+"px")}_removeTabBodyWrapperHeight(){let e=this._tabBodyWrapper.nativeElement;this._tabBodyWrapperHeight=e.clientHeight,e.style.height="",this._ngZone.run(()=>this.animationDone.emit())}_handleClick(e,t,i){t.focusIndex=i,e.disabled||(this.selectedIndex=i)}_getTabIndex(e){let t=this._lastFocusedTabIndex??this.selectedIndex;return e===t?0:-1}_tabFocusChanged(e,t){e&&e!=="mouse"&&e!=="touch"&&(this._tabHeader.focusIndex=t)}_bodyCentered(e){e&&this._tabBodies?.forEach((t,i)=>t._setActiveClass(i===this._selectedIndex))}_animationsDisabled(){return this._diAnimationsDisabled||this.animationDuration==="0"||this.animationDuration==="0ms"}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["mat-tab-group"]],contentQueries:function(t,i,r){if(t&1&&lt(r,ga,5),t&2){let c;O(c=F())&&(i._allTabs=c)}},viewQuery:function(t,i){if(t&1&&Pe(td,5)(id,5)(pa,5),t&2){let r;O(r=F())&&(i._tabBodyWrapper=r.first),O(r=F())&&(i._tabHeader=r.first),O(r=F())&&(i._tabBodies=r)}},hostAttrs:[1,"mat-mdc-tab-group"],hostVars:11,hostBindings:function(t,i){t&2&&($("mat-align-tabs",i.alignTabs),Ue("mat-"+(i.color||"primary")),zt("--mat-tab-animation-duration",i.animationDuration),G("mat-mdc-tab-group-dynamic-height",i.dynamicHeight)("mat-mdc-tab-group-inverted-header",i.headerPosition==="below")("mat-mdc-tab-group-stretch-tabs",i.stretchTabs))},inputs:{color:"color",fitInkBarToContent:[2,"fitInkBarToContent","fitInkBarToContent",D],stretchTabs:[2,"mat-stretch-tabs","stretchTabs",D],alignTabs:[0,"mat-align-tabs","alignTabs"],dynamicHeight:[2,"dynamicHeight","dynamicHeight",D],selectedIndex:[2,"selectedIndex","selectedIndex",Ze],headerPosition:"headerPosition",animationDuration:"animationDuration",contentTabIndex:[2,"contentTabIndex","contentTabIndex",Ze],disablePagination:[2,"disablePagination","disablePagination",D],disableRipple:[2,"disableRipple","disableRipple",D],preserveContent:[2,"preserveContent","preserveContent",D],backgroundColor:"backgroundColor",ariaLabel:[0,"aria-label","ariaLabel"],ariaLabelledby:[0,"aria-labelledby","ariaLabelledby"]},outputs:{selectedIndexChange:"selectedIndexChange",focusChange:"focusChange",animationDone:"animationDone",selectedTabChange:"selectedTabChange"},exportAs:["matTabGroup"],features:[ve([{provide:Ar,useExisting:n}])],ngContentSelectors:ha,decls:9,vars:8,consts:[["tabHeader",""],["tabBodyWrapper",""],["tabNode",""],[3,"indexFocused","selectFocusedIndex","selectedIndex","disableRipple","disablePagination","aria-label","aria-labelledby"],["role","tab","matTabLabelWrapper","","cdkMonitorElementFocus","",1,"mdc-tab","mat-mdc-tab","mat-focus-indicator",3,"id","mdc-tab--active","class","disabled","fitInkBarToContent"],[1,"mat-mdc-tab-body-wrapper"],["role","tabpanel",3,"id","class","content","position","animationDuration","preserveContent"],["role","tab","matTabLabelWrapper","","cdkMonitorElementFocus","",1,"mdc-tab","mat-mdc-tab","mat-focus-indicator",3,"click","cdkFocusChange","id","disabled","fitInkBarToContent"],[1,"mdc-tab__ripple"],["mat-ripple","",1,"mat-mdc-tab-ripple",3,"matRippleTrigger","matRippleDisabled"],[1,"mdc-tab__content"],[1,"mdc-tab__text-label"],[3,"cdkPortalOutlet"],["role","tabpanel",3,"_onCentered","_onCentering","_beforeCentering","id","content","position","animationDuration","preserveContent"]],template:function(t,i){t&1&&(Ne(),o(0,"mat-tab-header",3,0),C("indexFocused",function(c){return i._focusChanged(c)})("selectFocusedIndex",function(c){return i.selectedIndex=c}),I(2,rd,8,17,"div",4,_e),a(),h(4,ld,1,0),o(5,"div",5,1),I(7,sd,1,10,"mat-tab-body",6,_e),a()),t&2&&(g("selectedIndex",i.selectedIndex||0)("disableRipple",i.disableRipple)("disablePagination",i.disablePagination),Wa("aria-label",i.ariaLabel)("aria-labelledby",i.ariaLabelledby),d(2),A(i._tabs),d(2),f(i._isServer?4:-1),d(),G("_mat-animation-noopable",i._animationsDisabled()),d(2),A(i._tabs))},dependencies:[gd,Dr,lo,Pt,Xn,pa],styles:[`.mdc-tab {
  min-width: 90px;
  padding: 0 24px;
  display: flex;
  flex: 1 0 auto;
  justify-content: center;
  box-sizing: border-box;
  border: none;
  outline: none;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  z-index: 1;
  touch-action: manipulation;
}

.mdc-tab__content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: inherit;
  pointer-events: none;
}

.mdc-tab__text-label {
  transition: 150ms color linear;
  display: inline-block;
  line-height: 1;
  z-index: 2;
}

.mdc-tab--active .mdc-tab__text-label {
  transition-delay: 100ms;
}

._mat-animation-noopable .mdc-tab__text-label {
  transition: none;
}

.mdc-tab-indicator {
  display: flex;
  position: absolute;
  top: 0;
  left: 0;
  justify-content: center;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.mdc-tab-indicator__content {
  transition: var(--mat-tab-animation-duration, 250ms) transform cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: left;
  opacity: 0;
}

.mdc-tab-indicator__content--underline {
  align-self: flex-end;
  box-sizing: border-box;
  width: 100%;
  border-top-style: solid;
}

.mdc-tab-indicator--active .mdc-tab-indicator__content {
  opacity: 1;
}

._mat-animation-noopable .mdc-tab-indicator__content, .mdc-tab-indicator--no-transition .mdc-tab-indicator__content {
  transition: none;
}

.mat-mdc-tab-ripple.mat-mdc-tab-ripple {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  pointer-events: none;
}

.mat-mdc-tab {
  -webkit-tap-highlight-color: transparent;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-decoration: none;
  background: none;
  height: var(--mat-tab-container-height, 48px);
  font-family: var(--mat-tab-label-text-font, var(--mat-sys-title-small-font));
  font-size: var(--mat-tab-label-text-size, var(--mat-sys-title-small-size));
  letter-spacing: var(--mat-tab-label-text-tracking, var(--mat-sys-title-small-tracking));
  line-height: var(--mat-tab-label-text-line-height, var(--mat-sys-title-small-line-height));
  font-weight: var(--mat-tab-label-text-weight, var(--mat-sys-title-small-weight));
}
.mat-mdc-tab.mdc-tab {
  flex-grow: 0;
}
.mat-mdc-tab .mdc-tab-indicator__content--underline {
  border-color: var(--mat-tab-active-indicator-color, var(--mat-sys-primary));
  border-top-width: var(--mat-tab-active-indicator-height, 2px);
  border-radius: var(--mat-tab-active-indicator-shape, 0);
}
.mat-mdc-tab:hover .mdc-tab__text-label {
  color: var(--mat-tab-inactive-hover-label-text-color, var(--mat-sys-on-surface));
}
.mat-mdc-tab:focus .mdc-tab__text-label {
  color: var(--mat-tab-inactive-focus-label-text-color, var(--mat-sys-on-surface));
}
.mat-mdc-tab.mdc-tab--active .mdc-tab__text-label {
  color: var(--mat-tab-active-label-text-color, var(--mat-sys-on-surface));
}
.mat-mdc-tab.mdc-tab--active .mdc-tab__ripple::before,
.mat-mdc-tab.mdc-tab--active .mat-ripple-element {
  background-color: var(--mat-tab-active-ripple-color, var(--mat-sys-on-surface));
}
.mat-mdc-tab.mdc-tab--active:hover .mdc-tab__text-label {
  color: var(--mat-tab-active-hover-label-text-color, var(--mat-sys-on-surface));
}
.mat-mdc-tab.mdc-tab--active:hover .mdc-tab-indicator__content--underline {
  border-color: var(--mat-tab-active-hover-indicator-color, var(--mat-sys-primary));
}
.mat-mdc-tab.mdc-tab--active:focus .mdc-tab__text-label {
  color: var(--mat-tab-active-focus-label-text-color, var(--mat-sys-on-surface));
}
.mat-mdc-tab.mdc-tab--active:focus .mdc-tab-indicator__content--underline {
  border-color: var(--mat-tab-active-focus-indicator-color, var(--mat-sys-primary));
}
.mat-mdc-tab.mat-mdc-tab-disabled {
  opacity: 0.4;
  pointer-events: none;
}
.mat-mdc-tab.mat-mdc-tab-disabled .mdc-tab__content {
  pointer-events: none;
}
.mat-mdc-tab.mat-mdc-tab-disabled .mdc-tab__ripple::before,
.mat-mdc-tab.mat-mdc-tab-disabled .mat-ripple-element {
  background-color: var(--mat-tab-disabled-ripple-color, var(--mat-sys-on-surface-variant));
}
.mat-mdc-tab .mdc-tab__ripple::before {
  content: "";
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  pointer-events: none;
  background-color: var(--mat-tab-inactive-ripple-color, var(--mat-sys-on-surface));
}
.mat-mdc-tab .mdc-tab__text-label {
  color: var(--mat-tab-inactive-label-text-color, var(--mat-sys-on-surface));
  display: inline-flex;
  align-items: center;
}
.mat-mdc-tab .mdc-tab__content {
  position: relative;
  pointer-events: auto;
}
.mat-mdc-tab:hover .mdc-tab__ripple::before {
  opacity: 0.04;
}
.mat-mdc-tab.cdk-program-focused .mdc-tab__ripple::before, .mat-mdc-tab.cdk-keyboard-focused .mdc-tab__ripple::before {
  opacity: 0.12;
}
.mat-mdc-tab .mat-ripple-element {
  opacity: 0.12;
  background-color: var(--mat-tab-inactive-ripple-color, var(--mat-sys-on-surface));
}
.mat-mdc-tab-group.mat-mdc-tab-group-stretch-tabs > .mat-mdc-tab-header .mat-mdc-tab {
  flex-grow: 1;
}

.mat-mdc-tab-group {
  display: flex;
  flex-direction: column;
  max-width: 100%;
}
.mat-mdc-tab-group.mat-tabs-with-background > .mat-mdc-tab-header, .mat-mdc-tab-group.mat-tabs-with-background > .mat-mdc-tab-header-pagination {
  background-color: var(--mat-tab-background-color);
}
.mat-mdc-tab-group.mat-tabs-with-background.mat-primary > .mat-mdc-tab-header .mat-mdc-tab .mdc-tab__text-label {
  color: var(--mat-tab-foreground-color);
}
.mat-mdc-tab-group.mat-tabs-with-background.mat-primary > .mat-mdc-tab-header .mdc-tab-indicator__content--underline {
  border-color: var(--mat-tab-foreground-color);
}
.mat-mdc-tab-group.mat-tabs-with-background:not(.mat-primary) > .mat-mdc-tab-header .mat-mdc-tab:not(.mdc-tab--active) .mdc-tab__text-label {
  color: var(--mat-tab-foreground-color);
}
.mat-mdc-tab-group.mat-tabs-with-background:not(.mat-primary) > .mat-mdc-tab-header .mat-mdc-tab:not(.mdc-tab--active) .mdc-tab-indicator__content--underline {
  border-color: var(--mat-tab-foreground-color);
}
.mat-mdc-tab-group.mat-tabs-with-background > .mat-mdc-tab-header .mat-mdc-tab-header-pagination-chevron,
.mat-mdc-tab-group.mat-tabs-with-background > .mat-mdc-tab-header .mat-focus-indicator::before, .mat-mdc-tab-group.mat-tabs-with-background > .mat-mdc-tab-header-pagination .mat-mdc-tab-header-pagination-chevron,
.mat-mdc-tab-group.mat-tabs-with-background > .mat-mdc-tab-header-pagination .mat-focus-indicator::before {
  border-color: var(--mat-tab-foreground-color);
}
.mat-mdc-tab-group.mat-tabs-with-background > .mat-mdc-tab-header .mat-ripple-element, .mat-mdc-tab-group.mat-tabs-with-background > .mat-mdc-tab-header .mdc-tab__ripple::before, .mat-mdc-tab-group.mat-tabs-with-background > .mat-mdc-tab-header-pagination .mat-ripple-element, .mat-mdc-tab-group.mat-tabs-with-background > .mat-mdc-tab-header-pagination .mdc-tab__ripple::before {
  background-color: var(--mat-tab-foreground-color);
}
.mat-mdc-tab-group.mat-tabs-with-background > .mat-mdc-tab-header .mat-mdc-tab-header-pagination-chevron, .mat-mdc-tab-group.mat-tabs-with-background > .mat-mdc-tab-header-pagination .mat-mdc-tab-header-pagination-chevron {
  color: var(--mat-tab-foreground-color);
}
.mat-mdc-tab-group.mat-mdc-tab-group-inverted-header {
  flex-direction: column-reverse;
}
.mat-mdc-tab-group.mat-mdc-tab-group-inverted-header .mdc-tab-indicator__content--underline {
  align-self: flex-start;
}

.mat-mdc-tab-body-wrapper {
  position: relative;
  overflow: hidden;
  display: flex;
  transition: height 500ms cubic-bezier(0.35, 0, 0.25, 1);
}
.mat-mdc-tab-body-wrapper._mat-animation-noopable {
  transition: none !important;
  animation: none !important;
}
`],encapsulation:2})}return n})(),ua=class{index;tab};var Or=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=we({type:n});static \u0275inj=ke({imports:[Fe]})}return n})();var Ui=!1,Fr=250,vd=600*1e3,Cd=500,yd=15e3,xd=["atons.urn:mrn:imo:mmsi:*","shore.basestations.urn:mrn:imo:mmsi:*","vessels.urn:mrn:imo:mmsi:*","sar.urn:mrn:imo:mmsi:*"],kd=[{prefix:"atons.urn:mrn:imo:mmsi:",type:"aton"},{prefix:"shore.basestations.urn:mrn:imo:mmsi:",type:"basestation"},{prefix:"vessels.urn:mrn:imo:mmsi:",type:"vessel"},{prefix:"sar.urn:mrn:imo:mmsi:",type:"sar"}],wd="self.navigation.*",Rr=(()=>{class n{data=m(tt);destroyRef=m(be);tracks=new Map;contextIndex=new Map;mmsiIndex=new Map;maxTargets=Cd;targetTtlMs=vd;targetsDirty$=new me;ownShipDirty$=new me;pendingOwnShip={};_targets=T([]);_ownShip=T({});_hasCollisionRiskData=T(!1);targets=this._targets.asReadonly();ownShip=this._ownShip.asReadonly();hasCollisionRiskData=this._hasCollisionRiskData.asReadonly();getBearingTrue(e,t){if(typeof e.latitude!="number"||typeof e.longitude!="number"||typeof t.latitude!="number"||typeof t.longitude!="number")return null;let i=e.latitude*Math.PI/180,r=t.latitude*Math.PI/180,c=(t.longitude-e.longitude)*Math.PI/180,p=Math.sin(c)*Math.cos(r),_=Math.cos(i)*Math.sin(r)-Math.sin(i)*Math.cos(r)*Math.cos(c),k=Math.atan2(p,_)*180/Math.PI;return this.wrapDegrees(k)}constructor(){De(...xd.map(t=>this.data.subscribePathTree(t))).pipe(q(this.destroyRef)).subscribe(t=>this.handleAisTreeUpdate(t)),this.data.subscribePathTree(wd).pipe(q(this.destroyRef)).subscribe(t=>this.handleOwnShipTreeUpdate(t)),this.targetsDirty$.pipe(Hn(Fr,void 0,{leading:!0,trailing:!0}),q(this.destroyRef)).subscribe(()=>this.flushTargetsSignal()),Ia(yd).pipe(q(this.destroyRef)).subscribe(()=>this.evictStaleTracks(Date.now())),this.ownShipDirty$.pipe(Hn(Fr,void 0,{leading:!0,trailing:!0}),q(this.destroyRef)).subscribe(()=>this.flushOwnShip())}handleAisTreeUpdate(e){let t=this.matchAisContext(e.path);t&&(Ui&&console.debug("[AIS] update",{context:t.context,path:t.path,type:t.type,value:e.update.data.value}),this.applyAisUpdate({context:t.context,type:t.type,path:t.path,value:e.update.data.value,timestampMs:this.toTimestampMs(e.update.data.timestamp)}))}handleOwnShipTreeUpdate(e){if(!e.path.startsWith("self."))return;let t=e.path.slice(5);this.applyOwnShipUpdate(t,e.update.data.value)}matchAisContext(e){for(let t of kd){if(!e.startsWith(t.prefix))continue;let i=e.indexOf(".",t.prefix.length);return i===-1?null:{context:e.slice(0,i),path:e.slice(i+1),type:t.type}}return null}applyOwnShipUpdate(e,t){let i=R({},this.pendingOwnShip),r=this.readPositionValue(t);switch(e){case"navigation.position":r&&(i.position=r);break;case"navigation.position.latitude":{let c=this.toNumberOrUndefined(t);if(c===void 0)return;i.position=W(R({},i.position??{}),{latitude:c})}break;case"navigation.position.longitude":{let c=this.toNumberOrUndefined(t);if(c===void 0)return;i.position=W(R({},i.position??{}),{longitude:c})}break;case"navigation.headingTrue":i.headingTrue=this.toNumberOrUndefined(t);break;case"navigation.courseOverGroundTrue":i.courseOverGroundTrue=this.toNumberOrUndefined(t);break;case"navigation.speedOverGround":i.speedOverGround=this.toNumberOrUndefined(t);break;default:return}this.pendingOwnShip=i,this.ownShipDirty$.next()}flushOwnShip(){this.ownShipChanged(this._ownShip(),this.pendingOwnShip)&&this._ownShip.set(this.pendingOwnShip)}ownShipChanged(e,t){return e.headingTrue!==t.headingTrue||e.courseOverGroundTrue!==t.courseOverGroundTrue||e.speedOverGround!==t.speedOverGround||e.position?.latitude!==t.position?.latitude||e.position?.longitude!==t.position?.longitude}applyAisUpdate(e){let t=this.resolveTrack(e);if(t){switch(t.lastUpdateAt=e.timestampMs,e.path.startsWith("navigation.closestApproach.")&&this.isVesselLike(t)&&!t.closestApproach&&(t.closestApproach={}),e.path){case"mmsi":this.applyMmsi(t,e.value);break;case"name":t.name=this.toStringOrUndefined(e.value);break;case"communication.callsignVhf":this.isVesselLike(t)&&(t.callsign=this.toStringOrUndefined(e.value));break;case"navigation.destination":case"navigation.destination.commonName":this.isVesselLike(t)&&(t.destination=this.toStringOrUndefined(e.value));break;case"navigation.destination.eta":this.isVesselLike(t)&&(t.eta=this.toStringOrUndefined(e.value));break;case"design.beam":this.isVesselLike(t)&&(t.design=W(R({},t.design??{}),{beam:this.toNumberOrUndefined(e.value)}));break;case"design.length.overall":this.isVesselLike(t)&&(t.design=W(R({},t.design??{}),{length:W(R({},t.design?.length??{}),{overall:this.toNumberOrUndefined(e.value)})}));break;case"design.length.hull":this.isVesselLike(t)&&(t.design=W(R({},t.design??{}),{length:W(R({},t.design?.length??{}),{hull:this.toNumberOrUndefined(e.value)})}));break;case"design.length.waterline":this.isVesselLike(t)&&(t.design=W(R({},t.design??{}),{length:W(R({},t.design?.length??{}),{waterline:this.toNumberOrUndefined(e.value)})}));break;case"design.draft.maximum":this.isVesselLike(t)&&(t.design=W(R({},t.design??{}),{draft:W(R({},t.design?.draft??{}),{maximum:this.toNumberOrUndefined(e.value)})}));break;case"design.draft.minimum":this.isVesselLike(t)&&(t.design=W(R({},t.design??{}),{draft:W(R({},t.design?.draft??{}),{minimum:this.toNumberOrUndefined(e.value)})}));break;case"design.draft.current":this.isVesselLike(t)&&(t.design=W(R({},t.design??{}),{draft:W(R({},t.design?.draft??{}),{current:this.toNumberOrUndefined(e.value)})}));break;case"design.draft.canoe":this.isVesselLike(t)&&(t.design=W(R({},t.design??{}),{draft:W(R({},t.design?.draft??{}),{canoe:this.toNumberOrUndefined(e.value)})}));break;case"registrations.imo":this.isVesselLike(t)&&(t.imo=this.toStringOrUndefined(e.value));break;case"navigation.courseOverGroundTrue":this.isVesselLike(t)&&(t.courseOverGroundTrue=this.toNumberOrUndefined(e.value));break;case"navigation.headingTrue":this.isVesselLike(t)&&(t.headingTrue=this.toNumberOrUndefined(e.value));break;case"navigation.rateOfTurn":this.isVesselLike(t)&&(t.rateOfTurn=this.toNumberOrUndefined(e.value));break;case"navigation.specialManeuver":this.isVesselLike(t)&&(t.specialManeuver=this.toStringOrUndefined(e.value));break;case"navigation.speedOverGround":this.isVesselLike(t)&&(t.speedOverGround=this.toNumberOrUndefined(e.value));break;case"navigation.state":this.isVesselLike(t)&&(t.navState=this.toStringOrUndefined(e.value));break;case"sensors.ais.class":t.ais.class=this.normalizeAisClass(e.value);break;case"sensors.ais.status":{let i=this.normalizeAisStatus(e.value);if(!i)break;if(i==="remove"){this.removeTrack(t);return}t.ais.status=i}break;case"sensors.ais.fromBow":this.isVesselLike(t)&&(t.fromBow=this.toNumberOrUndefined(e.value));break;case"sensors.ais.fromCenter":this.isVesselLike(t)&&(t.fromCenter=this.toNumberOrUndefined(e.value));break;case"navigation.position.latitude":{let i=this.toNumberOrUndefined(e.value);if(i===void 0)break;t.position=W(R({},t.position??{}),{latitude:i}),t.lastPositionAt=e.timestampMs}break;case"navigation.position.longitude":{let i=this.toNumberOrUndefined(e.value);if(i===void 0)break;t.position=W(R({},t.position??{}),{longitude:i}),t.lastPositionAt=e.timestampMs}break;case"navigation.position.altitude":{let i=this.toNumberOrUndefined(e.value);t.position&&(t.position=W(R({},t.position),{altitude:i}))}break;case"navigation.position":{let i=this.readPositionValue(e.value);i&&(t.position=i,t.lastPositionAt=e.timestampMs)}break;case"atonType.id":this.isAton(t)&&(t.typeId=this.toNumberOrUndefined(e.value));break;case"atonType.name":this.isAton(t)&&(t.typeName=this.toStringOrUndefined(e.value));break;case"virtual":this.isAton(t)&&(t.virtual=!!e.value);break;case"offPosition":this.isAton(t)&&(t.offPosition=!!e.value);break;case"design.aisShipType.id":this.isVesselLike(t)&&(t.design=W(R({},t.design??{}),{aisShipType:W(R({},t.design?.aisShipType??{}),{id:this.toNumberOrUndefined(e.value)})}));break;case"design.aisShipType.name":this.isVesselLike(t)&&(t.design=W(R({},t.design??{}),{aisShipType:W(R({},t.design?.aisShipType??{}),{name:this.toStringOrUndefined(e.value)})}));break;case"navigation.closestApproach.distance":this.isVesselLike(t)&&t.closestApproach&&(t.closestApproach.distance=this.toNumberOrUndefined(e.value));break;case"navigation.closestApproach.timeTo":this.isVesselLike(t)&&t.closestApproach&&(t.closestApproach.timeTo=this.toNumberOrUndefined(e.value));break;case"navigation.closestApproach.range":this.isVesselLike(t)&&t.closestApproach&&(t.closestApproach.range=this.toNumberOrUndefined(e.value));break;case"navigation.closestApproach.bearing":this.isVesselLike(t)&&t.closestApproach&&(t.closestApproach.bearing=this.toNumberOrUndefined(e.value));break;case"navigation.closestApproach.collisionRiskRating":this.isVesselLike(t)&&t.closestApproach&&(t.closestApproach.collisionRiskRating=this.toNumberOrUndefined(e.value));break;case"design.length":if(this.isVesselLike(t)){let i=this.readNumericFields(e.value,["overall","hull","waterline"]);i&&(t.design=W(R({},t.design??{}),{length:i}))}break;case"design.draft":if(this.isVesselLike(t)){let i=this.readNumericFields(e.value,["maximum","minimum","current","canoe"]);i&&(t.design=W(R({},t.design??{}),{draft:i}))}break;case"design.aisShipType":if(this.isVesselLike(t)){let i=this.asRecord(e.value);if(i){let r=R({},this.readNumericFields(i,["id"])),c=this.toStringOrUndefined(i.name);c!==void 0&&(r.name=c),t.design=W(R({},t.design??{}),{aisShipType:r})}}break;case"navigation.closestApproach":if(this.isVesselLike(t)){let i=this.readNumericFields(e.value,["distance","timeTo","range","bearing","collisionRiskRating"]);i&&(t.closestApproach=i)}break}this.updateTargetsSignal()}}resolveTrack(e){let t=this.contextIndex.get(e.context),i=e.timestampMs,r=t?this.tracks.get(t):null;if(r)return r;let c=this.createTrack(e.context,e.type,i,void 0);return this.tracks.has(c.id)?c:null}createTrack(e,t,i,r){let c=this.buildTrackId(r??e),p=this.buildBaseTarget(e,t,i,r,c),_;switch(t){case"vessel":_=W(R({},p),{type:"vessel",closestApproach:{}});break;case"sar":_=W(R({},p),{type:"sar",closestApproach:{}});break;case"aton":_=W(R({},p),{type:"aton"});break;default:_=W(R({},p),{type:"basestation"});break}return this.tracks.set(_.id,_),this.contextIndex.set(e,_.id),r&&this.addMmsiIndex(r,_.id),this.enforceTargetCap(),this.updateTargetsSignal(),_}buildTrackId(e){if(!this.tracks.has(e))return e;let t=1;for(;this.tracks.has(`${e}-${t}`);)t+=1;return`${e}-${t}`}applyMmsi(e,t){let i=this.toStringOrUndefined(t);if(!i)return;let r=this.getTracksByMmsi(i).filter(c=>c.id!==e.id);r.length&&(this.markConflict(i),Ui&&console.error("[AIS] MMSI conflict",{mmsi:i,contexts:[e.context,...r.map(c=>c.context)]})),e.mmsi&&e.mmsi!==i&&this.removeMmsiIndex(e.mmsi,e.id),e.mmsi=i,this.addMmsiIndex(i,e.id)}removeTrack(e){this.tracks.delete(e.id),e.mmsi&&this.removeMmsiIndex(e.mmsi,e.id);for(let[t,i]of this.contextIndex.entries())i===e.id&&this.contextIndex.delete(t);this.data.removePathsForContext(e.context),Ui&&console.debug("[AIS] removed",{id:e.id,mmsi:e.mmsi,status:e.ais.status}),this.updateTargetsSignal()}updateTargetsSignal(){this.targetsDirty$.next()}enforceTargetCap(){for(;this.tracks.size>this.maxTargets;){let e=null;for(let t of this.tracks.values())(!e||t.lastUpdateAt<e.lastUpdateAt)&&(e=t);if(!e)break;this.removeTrack(e)}}evictStaleTracks(e){let t=e-this.targetTtlMs,i=[];for(let r of this.tracks.values())r.lastUpdateAt<t&&i.push(r);for(let r of i)this.removeTrack(r);this.enforceTargetCap()}flushTargetsSignal(){let e=Array.from(this.tracks.values()).filter(i=>!!i.mmsi||!!i.position),t=e.some(i=>{if(!this.isVesselLike(i))return!1;let r=i.closestApproach??{};return Object.prototype.hasOwnProperty.call(r,"collisionRiskRating")});this._targets.set(e),this._hasCollisionRiskData.set(t),Ui&&console.debug("[AIS] flush",{count:this.tracks.size})}getTracksByMmsi(e){let t=this.mmsiIndex.get(e);return t?Array.from(t).map(i=>this.tracks.get(i)).filter(i=>!!i):[]}addMmsiIndex(e,t){this.mmsiIndex.has(e)||this.mmsiIndex.set(e,new Set),this.mmsiIndex.get(e).add(t)}removeMmsiIndex(e,t){let i=this.mmsiIndex.get(e);i&&(i.delete(t),i.size||this.mmsiIndex.delete(e))}markConflict(e){let t=this.getTracksByMmsi(e);for(let i of t)i.conflicted=!0}normalizeAisClass(e){let t=typeof e=="string"?e.toUpperCase():"";if(t==="A")return"A";if(t==="B")return"B"}normalizeAisStatus(e){if(e==null)return;let t=String(e).toLowerCase();if(t==="unconfirmed"||t==="confirmed"||t==="lost"||t==="remove")return t}toTimestampMs(e){if(!e)return Date.now();let t=e instanceof Date?e.getTime():Date.parse(e);return Number.isFinite(t)?t:Date.now()}toNumberOrUndefined(e){let t=Number(e);return Number.isFinite(t)?t:void 0}toStringOrUndefined(e){if(e==null)return;let t=String(e).trim();return t.length?t:void 0}wrapDegrees(e){let t=e%360;return t<0?t+360:t}buildBaseTarget(e,t,i,r,c){return{id:c,context:e,type:t,ais:{class:void 0,status:"unconfirmed"},conflicted:!1,mmsi:r,position:void 0,lastUpdateAt:i,lastPositionAt:void 0}}isVesselLike(e){return e.type==="vessel"||e.type==="sar"}isAton(e){return e.type==="aton"}readPositionValue(e){if(!e||typeof e!="object")return;let t=this.toNumberOrUndefined(e.latitude),i=this.toNumberOrUndefined(e.longitude);if(t===void 0||i===void 0)return;let r=this.toNumberOrUndefined(e.altitude);return{latitude:t,longitude:i,altitude:r}}asRecord(e){if(!(!e||typeof e!="object"||Array.isArray(e)))return e}readNumericFields(e,t){let i=this.asRecord(e);if(!i)return;let r={};for(let c of t){let p=i[c];if(p==null)continue;let _=this.toNumberOrUndefined(p);_!==void 0&&(r[c]=_)}return r}static \u0275fac=function(t){return new(t||n)};static \u0275prov=xe({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})();function Sd(n,s){if(n&1&&(o(0,"div",3)(1,"span",13),l(2),a()()),n&2){u();let e=Pi(0),t=Pi(1);d(2),We("",t," ",e)}}function Md(n,s){if(n&1&&(o(0,"div",4)(1,"span",7),l(2,"State"),a(),o(3,"span",10),l(4),Ce(5,"titlecase"),a()()),n&2){let e=u(4);d(4),We("",Le(5,2,e.target.navState?`${e.target.navState}`:""),"",e.target.specialManeuver==="not available"?"":`, ${e.target.specialManeuver}`)}}function Td(n,s){n&1&&(o(0,"div",5),b(1,"mat-divider"),a())}function Ed(n,s){if(n&1&&(o(0,"div",6)(1,"span",7),l(2,"Bearing"),a(),o(3,"span",8),l(4),a()(),o(5,"div",6)(6,"span",7),l(7,"Range"),a(),o(8,"span",8),l(9),a()(),o(10,"div",6)(11,"span",7),l(12,"CPA"),a(),o(13,"span",8),l(14),a()(),o(15,"div",6)(16,"span",7),l(17,"TCPA"),a(),o(18,"span",8),l(19),a()(),o(20,"div",3),b(21,"mat-divider"),a()),n&2){let e=u(4);d(4),v(e.formatAngleWithUnit(e.target.closestApproach==null?null:e.target.closestApproach.bearing)),d(5),v(e.formatNauticalMilesWithUnit(e.target.closestApproach==null?null:e.target.closestApproach.range)),d(5),v(e.formatNauticalMilesWithUnit(e.target.closestApproach==null?null:e.target.closestApproach.distance)),d(5),v(e.formatRemainingTime(e.target.closestApproach==null?null:e.target.closestApproach.timeTo))}}function Id(n,s){if(n&1&&(o(0,"div",3)(1,"span",7),l(2,"ETA"),a(),o(3,"span",8),l(4),a()()),n&2){let e=u(4);d(4),v(e.formatText(e.target.eta))}}function Ad(n,s){if(n&1&&(Yn(0)(1),h(2,Sd,3,2,"div",3),h(3,Md,6,4,"div",4),h(4,Td,2,0,"div",5),h(5,Ed,22,4),o(6,"div",6)(7,"span",7),l(8,"COG"),a(),o(9,"span",8),l(10),o(11,"span",9),l(12,"T"),a()()(),o(13,"div",6)(14,"span",7),l(15,"SOG"),a(),o(16,"span",8),l(17),Ce(18,"number"),a()(),o(19,"div",6)(20,"span",7),l(21,"HDG"),a(),o(22,"span",8),l(23),o(24,"span",9),l(25,"T"),a()()(),o(26,"div",6)(27,"span",7),l(28,"ROT"),a(),o(29,"span",8),l(30),a()(),o(31,"div",3),b(32,"mat-divider"),a(),o(33,"div",6)(34,"span",7),l(35,"IMO"),a(),o(36,"span",8),l(37),a()(),o(38,"div",6)(39,"span",7),l(40,"MMSI"),a(),o(41,"span",8),l(42),a()(),o(43,"div",6)(44,"span",7),l(45,"VHF Callsign"),a(),o(46,"span",8),l(47),a()(),o(48,"div",6)(49,"span",7),l(50,"AIS Class"),a(),o(51,"span",8),l(52),a()(),o(53,"div",4)(54,"span",7),l(55,"Destination"),a(),o(56,"span",10),l(57),a()(),h(58,Id,5,1,"div",3),o(59,"div",3),b(60,"mat-divider"),a(),o(61,"div",6)(62,"span",7),l(63,"Latitude"),a(),o(64,"span",8),l(65),a()(),o(66,"div",6)(67,"span",7),l(68,"Longitude"),a(),o(69,"span",8),l(70),a()(),o(71,"div",11)(72,"span",12),l(73),a()()),n&2){let e=u(3),t=Di(!(e.target.design==null||e.target.design.aisShipType==null)&&e.target.design.aisShipType.name?`${e.target.design==null||e.target.design.aisShipType==null?null:e.target.design.aisShipType.name}`:""),i=!(e.target.design==null||e.target.design.length==null)&&e.target.design.length.overall?`${e.target.design==null||e.target.design.length==null?null:e.target.design.length.overall}m`:"?m",r=e.target.design!=null&&e.target.design.beam?`${e.target.design==null?null:e.target.design.beam}m`:"?m";d(),Di(i&&r?`${i} x ${r}`:""),d(),f(!(e.target.design==null||e.target.design.length==null)&&e.target.design.length.overall||e.target.design!=null&&e.target.design.beam||t?2:-1),d(),f(e.target.navState||e.target.specialManeuver?3:-1),d(),f(!(e.target.design==null||e.target.design.length==null)&&e.target.design.length.overall||e.target.design!=null&&e.target.design.beam||t||e.target.navState||e.target.specialManeuver?4:-1),d(),f(e.hasClosestApproach(e.target.closestApproach)?5:-1),d(5),B("",e.formatDirection(e.target.courseOverGroundTrue),"\xB0 "),d(7),B("",Fi(18,19,e.target.speedOverGround,"1.1-1")," kn"),d(6),B("",e.formatDirection(e.target.headingTrue),"\xB0 "),d(7),v(e.formatRateOfTurn(e.target.rateOfTurn)),d(7),v(e.formatText(e.target.imo)),d(5),v(e.formatText(e.target.mmsi)),d(5),v(e.formatText(e.target.callsign)),d(5),v(e.formatText(e.target.ais.class)),d(5),v(e.formatText(e.target.destination)),d(),f(e.target.eta?58:-1),d(7),v(e.formatLatLon(e.target.position==null?null:e.target.position.latitude,"latitudeMin")),d(5),v(e.formatLatLon(e.target.position==null?null:e.target.position.longitude,"longitudeMin")),d(3),B("Received ",e.formatSinceTimestamp(e.target.lastPositionAt)," ago")}}function Dd(n,s){if(n&1&&h(0,Ad,74,22),n&2){let e=u(2);f(e.isVesselLike(e.target)?0:-1)}}function Pd(n,s){if(n&1&&(o(0,"div",3)(1,"span",13),l(2),a()()),n&2){u();let e=Pi(0),t=Pi(1);d(2),We("",t," ",e)}}function Od(n,s){if(n&1&&(o(0,"div",4)(1,"span",7),l(2,"State"),a(),o(3,"span",10),l(4),Ce(5,"titlecase"),a()()),n&2){let e=u(4);d(4),We("",Le(5,2,e.target.navState?`${e.target.navState}`:""),"",e.target.specialManeuver==="not available"?"":`, ${e.target.specialManeuver}`)}}function Fd(n,s){n&1&&(o(0,"div",5),b(1,"mat-divider"),a())}function Rd(n,s){if(n&1&&(o(0,"div",6)(1,"span",7),l(2,"Bearing"),a(),o(3,"span",8),l(4),a()(),o(5,"div",6)(6,"span",7),l(7,"Range"),a(),o(8,"span",8),l(9),a()(),o(10,"div",6)(11,"span",7),l(12,"CPA"),a(),o(13,"span",8),l(14),a()(),o(15,"div",6)(16,"span",7),l(17,"TCPA"),a(),o(18,"span",8),l(19),a()(),o(20,"div",3),b(21,"mat-divider"),a()),n&2){let e=u(4);d(4),v(e.formatAngleWithUnit(e.target.closestApproach==null?null:e.target.closestApproach.bearing)),d(5),v(e.formatNauticalMilesWithUnit(e.target.closestApproach==null?null:e.target.closestApproach.range)),d(5),v(e.formatNauticalMilesWithUnit(e.target.closestApproach==null?null:e.target.closestApproach.distance)),d(5),v(e.formatRemainingTime(e.target.closestApproach==null?null:e.target.closestApproach.timeTo))}}function Nd(n,s){if(n&1&&(o(0,"div",3)(1,"span",7),l(2,"ETA"),a(),o(3,"span",8),l(4),a()()),n&2){let e=u(4);d(4),v(e.formatText(e.target.eta))}}function Ld(n,s){if(n&1&&(Yn(0)(1),h(2,Pd,3,2,"div",3),h(3,Od,6,4,"div",4),h(4,Fd,2,0,"div",5),h(5,Rd,22,4),o(6,"div",6)(7,"span",7),l(8,"COG"),a(),o(9,"span",8),l(10),o(11,"span",9),l(12,"T"),a()()(),o(13,"div",6)(14,"span",7),l(15,"SOG"),a(),o(16,"span",8),l(17),Ce(18,"number"),a()(),o(19,"div",6)(20,"span",7),l(21,"HDG"),a(),o(22,"span",8),l(23),o(24,"span",9),l(25,"T"),a()()(),o(26,"div",6)(27,"span",7),l(28,"ROT"),a(),o(29,"span",8),l(30),a()(),o(31,"div",3),b(32,"mat-divider"),a(),o(33,"div",6)(34,"span",7),l(35,"IMO"),a(),o(36,"span",8),l(37),a()(),o(38,"div",6)(39,"span",7),l(40,"MMSI"),a(),o(41,"span",8),l(42),a()(),o(43,"div",6)(44,"span",7),l(45,"VHF Callsign"),a(),o(46,"span",8),l(47),a()(),o(48,"div",6)(49,"span",7),l(50,"AIS Class"),a(),o(51,"span",8),l(52),a()(),o(53,"div",4)(54,"span",7),l(55,"Destination"),a(),o(56,"span",10),l(57),a()(),h(58,Nd,5,1,"div",3),o(59,"div",3),b(60,"mat-divider"),a(),o(61,"div",6)(62,"span",7),l(63,"Latitude"),a(),o(64,"span",8),l(65),a()(),o(66,"div",6)(67,"span",7),l(68,"Longitude"),a(),o(69,"span",8),l(70),a()(),o(71,"div",11)(72,"span",12),l(73),a()()),n&2){let e=u(3),t=Di(!(e.target.design==null||e.target.design.aisShipType==null)&&e.target.design.aisShipType.name?`${e.target.design==null||e.target.design.aisShipType==null?null:e.target.design.aisShipType.name}`:""),i=!(e.target.design==null||e.target.design.length==null)&&e.target.design.length.overall?`${e.target.design==null||e.target.design.length==null?null:e.target.design.length.overall}m`:"?m",r=e.target.design!=null&&e.target.design.beam?`${e.target.design==null?null:e.target.design.beam}m`:"?m";d(),Di(i&&r?`${i} x ${r}`:""),d(),f(!(e.target.design==null||e.target.design.length==null)&&e.target.design.length.overall||e.target.design!=null&&e.target.design.beam||t?2:-1),d(),f(e.target.navState||e.target.specialManeuver?3:-1),d(),f(!(e.target.design==null||e.target.design.length==null)&&e.target.design.length.overall||e.target.design!=null&&e.target.design.beam||t||e.target.navState||e.target.specialManeuver?4:-1),d(),f(e.hasClosestApproach(e.target.closestApproach)?5:-1),d(5),B("",e.formatDirection(e.target.courseOverGroundTrue),"\xB0 "),d(7),B("",Fi(18,19,e.target.speedOverGround,"1.1-1")," kn"),d(6),B("",e.formatDirection(e.target.headingTrue),"\xB0 "),d(7),v(e.formatRateOfTurn(e.target.rateOfTurn)),d(7),v(e.formatText(e.target.imo)),d(5),v(e.formatText(e.target.mmsi)),d(5),v(e.formatText(e.target.callsign)),d(5),v(e.formatText(e.target.ais.class)),d(5),v(e.formatText(e.target.destination)),d(),f(e.target.eta?58:-1),d(7),v(e.formatLatLon(e.target.position==null?null:e.target.position.latitude,"latitudeMin")),d(5),v(e.formatLatLon(e.target.position==null?null:e.target.position.longitude,"longitudeMin")),d(3),B("Received ",e.formatSinceTimestamp(e.target.lastPositionAt)," ago")}}function Vd(n,s){if(n&1&&h(0,Ld,74,22),n&2){let e=u(2);f(e.isVesselLike(e.target)?0:-1)}}function Gd(n,s){if(n&1&&(o(0,"div",3)(1,"span",13),l(2),a()(),o(3,"div",4)(4,"span",7),l(5,"Off Position"),a(),o(6,"span",8),l(7),a()(),o(8,"div",6)(9,"span",7),l(10,"Type"),a(),o(11,"span",8),l(12,"Aid to Navigation"),a()(),o(13,"div",6)(14,"span",7),l(15,"Type ID"),a(),o(16,"span",8),l(17),a()(),o(18,"div",3),b(19,"mat-divider"),a(),o(20,"div",6)(21,"span",7),l(22,"MMSI"),a(),o(23,"span",8),l(24),a()(),o(25,"div",6)(26,"span",7),l(27,"Status"),a(),o(28,"span",8),l(29),Ce(30,"titlecase"),a()(),o(31,"div",3),b(32,"mat-divider"),a(),o(33,"div",6)(34,"span",7),l(35,"Latitude"),a(),o(36,"span",8),l(37),a()(),o(38,"div",6)(39,"span",7),l(40,"Longitude"),a(),o(41,"span",8),l(42),a()(),o(43,"div",11)(44,"span",12),l(45),a()()),n&2){let e=u(3);d(2),v(e.formatText(e.target.name)),d(5),v(e.target.offPosition?"Yes":"No"),d(10),v(e.formatText(e.target.typeId==null?null:e.target.typeId.toString())),d(7),v(e.formatText(e.target.mmsi)),d(5),v(Le(30,8,e.target.ais.status)),d(8),v(e.formatLatLon(e.target.position==null?null:e.target.position.latitude,"latitudeMin")),d(5),v(e.formatLatLon(e.target.position==null?null:e.target.position.longitude,"longitudeMin")),d(3),B("Received ",e.formatSinceTimestamp(e.target.lastPositionAt)," ago")}}function Bd(n,s){if(n&1&&h(0,Gd,46,10),n&2){let e=u(2);f(e.isAton(e.target)?0:-1)}}function zd(n,s){if(n&1&&(o(0,"div",6)(1,"span",7),l(2,"Name"),a(),o(3,"span",8),l(4),a()(),o(5,"div",6)(6,"span",7),l(7,"MMSI"),a(),o(8,"span",8),l(9),a()(),o(10,"div",6)(11,"span",7),l(12,"Status"),a(),o(13,"span",8),l(14),Ce(15,"titlecase"),a()(),o(16,"div",6)(17,"span",7),l(18,"AIS Class"),a(),o(19,"span",8),l(20),a()(),o(21,"div",3),b(22,"mat-divider"),a(),o(23,"div",6)(24,"span",7),l(25,"Latitude"),a(),o(26,"span",8),l(27),a()(),o(28,"div",6)(29,"span",7),l(30,"Longitude"),a(),o(31,"span",8),l(32),a()(),o(33,"div",11)(34,"span",12),l(35),a()()),n&2){let e=u(3);d(4),v(e.formatText(e.target.name)),d(5),v(e.formatText(e.target.mmsi)),d(5),v(Le(15,7,e.target.ais.status)),d(6),v(e.formatText(e.target.ais.class)),d(7),v(e.formatLatLon(e.target.position==null?null:e.target.position.latitude,"latitudeMin")),d(5),v(e.formatLatLon(e.target.position==null?null:e.target.position.longitude,"longitudeMin")),d(3),B("Received ",e.formatSinceTimestamp(e.target.lastPositionAt)," ago")}}function Ud(n,s){if(n&1&&h(0,zd,36,9),n&2){let e=u(2);f(e.isBasestation(e.target)?0:-1)}}function Wd(n,s){if(n&1&&(o(0,"div",0)(1,"div",2),h(2,Dd,1,1)(3,Vd,1,1)(4,Bd,1,1)(5,Ud,1,1),a()()),n&2){let e,t=u();d(2),f((e=t.target.type)==="vessel"?2:e==="sar"?3:e==="aton"?4:e==="basestation"?5:-1)}}function $d(n,s){n&1&&(o(0,"div",1),l(1,"No AIS target selected."),a())}var Nr=(()=>{class n{static CLOCK_INTERVAL_MS=1e3;data=m(dt);units=m(xn);ais=m(Rr);ngZone=m(ae);now=T(Date.now());nowTimer=null;ngOnInit(){this.startClock()}get payload(){return this.data?.payload??null}get target(){let e=this.payload?.target??null;return e?this.ais.targets().find(t=>t.id===e.id)??e:null}formatDirection(e){if(e==null||!Number.isFinite(e))return"--";let t=this.units.convertToUnit("deg",e);return t===null?"--":t.toFixed(0)}formatNauticalMilesWithUnit(e){if(e==null||!Number.isFinite(e))return"--";let t=this.units.convertToUnit("nm",e);return t===null?"--":`${t.toFixed(1)} nm`}formatAngleWithUnit(e){return e==null||!Number.isFinite(e)?"--":`${e.toFixed(0)}\xB0`}formatRemainingTime(e){if(e==null||!Number.isFinite(e))return"--";let t=Math.max(0,Math.round(e)),i=Math.floor(t/3600),r=Math.floor(t%3600/60),c=t%60;return i>0?`${i}:${String(r).padStart(2,"0")}:${String(c).padStart(2,"0")}`:`${r}:${String(c).padStart(2,"0")}`}formatSinceTimestamp(e){if(e==null||!Number.isFinite(e))return"--";let t=Math.max(0,Math.floor((this.now()-e)/1e3)),i=Math.floor(t/3600),r=Math.floor(t%3600/60),c=t%60;return i>0?`${i}:${String(r).padStart(2,"0")}:${String(c).padStart(2,"0")}`:`${r}:${String(c).padStart(2,"0")}`}formatRateOfTurn(e){if(e==null||!Number.isFinite(e))return"--";let t=e>=0?"Stb":"Port",i=Math.abs(e)*(180/Math.PI)*60;return`${t} ${i.toFixed(0)}\xB0/min`}formatLatLon(e,t){if(e==null||!Number.isFinite(e))return"--";let i=this.units.convertToUnit(t,e);return i===null?"--":i.toString()}formatText(e){return e&&e.length?e:"--"}hasClosestApproach(e){return e?typeof e.bearing=="number"||typeof e.range=="number"||typeof e.distance=="number"||typeof e.timeTo=="number":!1}isVesselLike(e){return e.type==="vessel"||e.type==="sar"}isAton(e){return e.type==="aton"}isBasestation(e){return e.type==="basestation"}startClock(){this.ngZone.runOutsideAngular(()=>{this.nowTimer=window.setInterval(()=>{this.ngZone.run(()=>{this.now.set(Date.now())})},n.CLOCK_INTERVAL_MS)})}ngOnDestroy(){this.nowTimer!==null&&(clearInterval(this.nowTimer),this.nowTimer=null)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["dialog-ais-target"]],decls:2,vars:1,consts:[[1,"ais-dialog","mat-typography"],[1,"ais-dialog-empty"],[1,"ais-dialog-grid"],[1,"ais-dialog-item","ais-dialog-item-span"],[1,"ais-dialog-long-item","ais-dialog-item-span"],[1,"ais-dialog-item","ais-dialog-item-span","ais-divider"],[1,"ais-dialog-item"],[1,"ais-dialog-key","mat-subtitle-2"],[1,"ais-dialog-value","mat-body-2"],[2,"font-size","10px"],[1,"ais-dialog-long-value","mat-body-2"],[1,"ais-dialog-item",2,"grid-column","span 2"],[1,"ais-dialog-value","mat-body-4",2,"grid-column","span 2","text-align","center"],[1,"ais-vessel-description"]],template:function(t,i){t&1&&h(0,Wd,6,1,"div",0)(1,$d,2,0,"div",1),t&2&&f(i.target?0:1)},dependencies:[Xe,ct,et,Wt,eo],styles:[".ais-dialog-panel .mat-mdc-dialog-container{--mat-dialog-content-padding: 0px 24px 20px 24px}.ais-dialog[_ngcontent-%COMP%]{display:grid;gap:8px;color:var(--skip-contrast-color)}.ais-dialog-grid[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 14px}.ais-vessel-description[_ngcontent-%COMP%]{grid-column:span 2;font-size:var(--mat-sys-body-large-size)}.ais-dialog-long-item[_ngcontent-%COMP%]{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;align-items:baseline;gap:6px}.ais-dialog-long-value[_ngcontent-%COMP%]{grid-column:span 3;color:var(--skip-contrast-color)}.ais-dialog-item[_ngcontent-%COMP%]{display:grid;grid-template-columns:1fr 1fr;align-items:baseline;gap:6px}.ais-divider[_ngcontent-%COMP%]{margin-top:6px}.ais-dialog-item[_ngcontent-%COMP%]   mat-divider[_ngcontent-%COMP%]{grid-column:1/-1}.ais-dialog-item-span[_ngcontent-%COMP%]{grid-column:span 2}.ais-dialog-key[_ngcontent-%COMP%]{color:var(--skip-contrast-dim-color);letter-spacing:.04em}.ais-dialog-value[_ngcontent-%COMP%], .ais-dialog-empty[_ngcontent-%COMP%]{color:var(--skip-contrast-color)}"],changeDetection:0})}return n})();function qd(n,s){if(n&1&&b(0,"img",3),n&2){let e=u();g("src",e.data.iconHref,Ga)}}function Hd(n,s){n&1&&$a(0)}var Fn=(()=>{class n{data=m(dt);static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["dialog-frame"]],decls:10,vars:4,consts:[[1,"dialogue-header"],[1,"dialog-title"],["mat-dialog-title",""],["alt","","aria-hidden","true",1,"dialog-title-icon",3,"src"],["mat-icon-button","",1,"dialog-close-icon",3,"mat-dialog-close"],[1,"dialog-content-padding"],[4,"ngComponentOutlet"]],template:function(t,i){t&1&&(o(0,"div",0)(1,"div",1)(2,"h5",2),h(3,qd,1,1,"img",3),l(4),a()(),o(5,"button",4)(6,"mat-icon"),l(7,"close"),a()()(),o(8,"mat-dialog-content",5),ze(9,Hd,1,0,"ng-container",6),a()),t&2&&(d(3),f(i.data.iconHref?3:-1),d(),B(" ",i.data.title),d(),g("mat-dialog-close",!1),d(4),g("ngComponentOutlet",i.data.componentType??null))},dependencies:[K,Xe,yt,xt,kt,se,le,Xa],styles:[".dialogue-header[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:center}.dialog-title[_ngcontent-%COMP%]{display:flex;align-items:center}.dialog-title-icon[_ngcontent-%COMP%]{position:relative;top:12px;width:42px;height:42px;object-fit:contain}.dialog-close-icon[_ngcontent-%COMP%]{margin-right:15px}.mat-mdc-dialog-content[_ngcontent-%COMP%]{max-height:max-content}"]})}return n})();function jd(n,s){if(n&1&&(o(0,"button",4),l(1),a()),n&2){let e=u();g("mat-dialog-close",!0),d(),v(e.data.confirmBtnText)}}var Lr=(()=>{class n{data=m(dt);static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["dialog-confirmation"]],decls:12,vars:6,consts:[[1,"dialogue-header"],["mat-dialog-title",""],["mat-icon-button","",1,"dialog-close-icon",3,"mat-dialog-close"],["align","end"],["mat-flat-button","",3,"mat-dialog-close"]],template:function(t,i){t&1&&(o(0,"div",0)(1,"h5",1),l(2),a(),o(3,"button",2)(4,"mat-icon"),l(5,"close"),a()()(),o(6,"mat-dialog-content"),l(7),a(),o(8,"mat-dialog-actions",3)(9,"button",4),l(10),a(),h(11,jd,2,2,"button",4),a()),t&2&&(d(2),v(i.data.title),d(),g("mat-dialog-close",!1),d(4),B(" ",i.data.message,`
`),d(2),g("mat-dialog-close",!1),d(),v(i.data.cancelBtnText),d(),f(i.data.confirmBtnText?11:-1))},dependencies:[K,Xe,yt,xt,qt,kt,se,Se,le],styles:[".dialogue-header[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:baseline}.dialog-close-icon[_ngcontent-%COMP%]{margin-right:15px}.mat-mdc-dialog-content[_ngcontent-%COMP%]{max-height:max-content}"]})}return n})();var Kd=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["ng-component"]],hostAttrs:["cdk-text-field-style-loader",""],decls:0,vars:0,template:function(t,i){},styles:[`textarea.cdk-textarea-autosize {
  resize: none;
}

textarea.cdk-textarea-autosize-measuring {
  padding: 2px 0 !important;
  box-sizing: content-box !important;
  height: auto !important;
  overflow: hidden !important;
}

textarea.cdk-textarea-autosize-measuring-firefox {
  padding: 2px 0 !important;
  box-sizing: content-box !important;
  height: 0 !important;
}

@keyframes cdk-text-field-autofill-start { /*!*/ }
@keyframes cdk-text-field-autofill-end { /*!*/ }
.cdk-text-field-autofill-monitored:-webkit-autofill {
  animation: cdk-text-field-autofill-start 0s 1ms;
}

.cdk-text-field-autofill-monitored:not(:-webkit-autofill) {
  animation: cdk-text-field-autofill-end 0s 1ms;
}
`],encapsulation:2,changeDetection:0})}return n})(),Qd={passive:!0},Vr=(()=>{class n{_platform=m(ht);_ngZone=m(ae);_renderer=m(Ba).createRenderer(null,null);_styleLoader=m(st);_monitoredElements=new Map;constructor(){}monitor(e){if(!this._platform.isBrowser)return ci;this._styleLoader.load(Kd);let t=Zn(e),i=this._monitoredElements.get(t);if(i)return i.subject;let r=new me,c="cdk-text-field-autofilled",p=k=>{k.animationName==="cdk-text-field-autofill-start"&&!t.classList.contains(c)?(t.classList.add(c),this._ngZone.run(()=>r.next({target:k.target,isAutofilled:!0}))):k.animationName==="cdk-text-field-autofill-end"&&t.classList.contains(c)&&(t.classList.remove(c),this._ngZone.run(()=>r.next({target:k.target,isAutofilled:!1})))},_=this._ngZone.runOutsideAngular(()=>(t.classList.add("cdk-text-field-autofill-monitored"),this._renderer.listen(t,"animationstart",p,Qd)));return this._monitoredElements.set(t,{subject:r,unlisten:_}),r}stopMonitoring(e){let t=Zn(e),i=this._monitoredElements.get(t);i&&(i.unlisten(),i.subject.complete(),t.classList.remove("cdk-text-field-autofill-monitored"),t.classList.remove("cdk-text-field-autofilled"),this._monitoredElements.delete(t))}ngOnDestroy(){this._monitoredElements.forEach((e,t)=>this.stopMonitoring(t))}static \u0275fac=function(t){return new(t||n)};static \u0275prov=xe({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})();var Gr=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=we({type:n});static \u0275inj=ke({})}return n})();var Br=new H("MAT_INPUT_VALUE_ACCESSOR");var Yd=["button","checkbox","file","hidden","image","radio","range","reset","submit"],Zd=new H("MAT_INPUT_CONFIG"),ge=(()=>{class n{_elementRef=m(X);_platform=m(ht);ngControl=m(pn,{optional:!0,self:!0});_autofillMonitor=m(Vr);_ngZone=m(ae);_formField=m(Xt,{optional:!0});_renderer=m(Be);_uid=m(ye).getId("mat-input-");_previousNativeValue;_inputValueAccessor;_signalBasedValueAccessor;_previousPlaceholder=null;_errorStateTracker;_config=m(Zd,{optional:!0});_cleanupIosKeyup;_cleanupWebkitWheel;_isServer=!1;_isNativeSelect=!1;_isTextarea=!1;_isInFormField=!1;focused=!1;stateChanges=new me;controlType="mat-input";autofilled=!1;get disabled(){return this._disabled}set disabled(e){this._disabled=hi(e),this.focused&&(this.focused=!1,this.stateChanges.next())}_disabled=!1;get id(){return this._id}set id(e){this._id=e||this._uid}_id;placeholder;name;get required(){return this._required??this.ngControl?.control?.hasValidator(z.required)??!1}set required(e){this._required=hi(e)}_required;get type(){return this._type}set type(e){this._type=e||"text",this._validateType(),!this._isTextarea&&ta().has(this._type)&&(this._elementRef.nativeElement.type=this._type)}_type="text";get errorStateMatcher(){return this._errorStateTracker.matcher}set errorStateMatcher(e){this._errorStateTracker.matcher=e}userAriaDescribedBy;get value(){return this._signalBasedValueAccessor?this._signalBasedValueAccessor.value():this._inputValueAccessor.value}set value(e){e!==this.value&&(this._signalBasedValueAccessor?this._signalBasedValueAccessor.value.set(e):this._inputValueAccessor.value=e,this.stateChanges.next())}get readonly(){return this._readonly}set readonly(e){this._readonly=hi(e)}_readonly=!1;disabledInteractive;get errorState(){return this._errorStateTracker.errorState}set errorState(e){this._errorStateTracker.errorState=e}_neverEmptyInputTypes=["date","datetime","datetime-local","month","time","week"].filter(e=>ta().has(e));constructor(){let e=m(jt,{optional:!0}),t=m(U,{optional:!0}),i=m(hn),r=m(Br,{optional:!0,self:!0}),c=this._elementRef.nativeElement,p=c.nodeName.toLowerCase();r?Ua(r.value)?this._signalBasedValueAccessor=r:this._inputValueAccessor=r:this._inputValueAccessor=c,this._previousNativeValue=this.value,this.id=this.id,this._platform.IOS&&this._ngZone.runOutsideAngular(()=>{this._cleanupIosKeyup=this._renderer.listen(c,"keyup",this._iOSKeyupListener)}),this._errorStateTracker=new fn(i,this.ngControl,t,e,this.stateChanges),this._isServer=!this._platform.isBrowser,this._isNativeSelect=p==="select",this._isTextarea=p==="textarea",this._isInFormField=!!this._formField,this.disabledInteractive=this._config?.disabledInteractive||!1,this._isNativeSelect&&(this.controlType=c.multiple?"mat-native-select-multiple":"mat-native-select"),this._signalBasedValueAccessor&&Gt(()=>{this._signalBasedValueAccessor.value(),this.stateChanges.next()})}ngAfterViewInit(){this._platform.isBrowser&&this._autofillMonitor.monitor(this._elementRef.nativeElement).subscribe(e=>{this.autofilled=e.isAutofilled,this.stateChanges.next()})}ngOnChanges(){this.stateChanges.next()}ngOnDestroy(){this.stateChanges.complete(),this._platform.isBrowser&&this._autofillMonitor.stopMonitoring(this._elementRef.nativeElement),this._cleanupIosKeyup?.(),this._cleanupWebkitWheel?.()}ngDoCheck(){this.ngControl&&(this.updateErrorState(),this.ngControl.disabled!==null&&this.ngControl.disabled!==this.disabled&&(this.disabled=this.ngControl.disabled,this.stateChanges.next())),this._dirtyCheckNativeValue(),this._dirtyCheckPlaceholder()}focus(e){this._elementRef.nativeElement.focus(e)}updateErrorState(){this._errorStateTracker.updateErrorState()}_focusChanged(e){if(e!==this.focused){if(!this._isNativeSelect&&e&&this.disabled&&this.disabledInteractive){let t=this._elementRef.nativeElement;t.type==="number"?(t.type="text",t.setSelectionRange(0,0),t.type="number"):t.setSelectionRange(0,0)}this.focused=e,this.stateChanges.next()}}_onInput(){}_dirtyCheckNativeValue(){let e=this._elementRef.nativeElement.value;this._previousNativeValue!==e&&(this._previousNativeValue=e,this.stateChanges.next())}_dirtyCheckPlaceholder(){let e=this._getPlaceholder();if(e!==this._previousPlaceholder){let t=this._elementRef.nativeElement;this._previousPlaceholder=e,e?t.setAttribute("placeholder",e):t.removeAttribute("placeholder")}}_getPlaceholder(){return this.placeholder||null}_validateType(){Yd.indexOf(this._type)>-1}_isNeverEmpty(){return this._neverEmptyInputTypes.indexOf(this._type)>-1}_isBadInput(){let e=this._elementRef.nativeElement.validity;return e&&e.badInput}get empty(){return!this._isNeverEmpty()&&!this._elementRef.nativeElement.value&&!this._isBadInput()&&!this.autofilled}get shouldLabelFloat(){if(this._isNativeSelect){let e=this._elementRef.nativeElement,t=e.options[0];return this.focused||e.multiple||!this.empty||!!(e.selectedIndex>-1&&t&&t.label)}else return this.focused&&!this.disabled||!this.empty}get describedByIds(){return this._elementRef.nativeElement.getAttribute("aria-describedby")?.split(" ")||[]}setDescribedByIds(e){let t=this._elementRef.nativeElement;e.length?t.setAttribute("aria-describedby",e.join(" ")):t.removeAttribute("aria-describedby")}onContainerClick(){this.focused||this.focus()}_isInlineSelect(){let e=this._elementRef.nativeElement;return this._isNativeSelect&&(e.multiple||e.size>1)}_iOSKeyupListener=e=>{let t=e.target;!t.value&&t.selectionStart===0&&t.selectionEnd===0&&(t.setSelectionRange(1,1),t.setSelectionRange(0,0))};_getReadonlyAttribute(){return this._isNativeSelect?null:this.readonly||this.disabled&&this.disabledInteractive?"true":null}static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,selectors:[["input","matInput",""],["textarea","matInput",""],["select","matNativeControl",""],["input","matNativeControl",""],["textarea","matNativeControl",""]],hostAttrs:[1,"mat-mdc-input-element"],hostVars:21,hostBindings:function(t,i){t&1&&C("focus",function(){return i._focusChanged(!0)})("blur",function(){return i._focusChanged(!1)})("input",function(){return i._onInput()}),t&2&&(ut("id",i.id)("disabled",i.disabled&&!i.disabledInteractive)("required",i.required),$("name",i.name||null)("readonly",i._getReadonlyAttribute())("aria-disabled",i.disabled&&i.disabledInteractive?"true":null)("aria-invalid",i.empty&&i.required?null:i.errorState)("aria-required",i.required)("id",i.id),G("mat-input-server",i._isServer)("mat-mdc-form-field-textarea-control",i._isInFormField&&i._isTextarea)("mat-mdc-form-field-input-control",i._isInFormField)("mat-mdc-input-disabled-interactive",i.disabledInteractive)("mdc-text-field__input",i._isInFormField)("mat-mdc-native-select-inline",i._isInlineSelect()))},inputs:{disabled:"disabled",id:"id",placeholder:"placeholder",name:"name",required:"required",type:"type",errorStateMatcher:"errorStateMatcher",userAriaDescribedBy:[0,"aria-describedby","userAriaDescribedBy"],value:"value",readonly:"readonly",disabledInteractive:[2,"disabledInteractive","disabledInteractive",D]},exportAs:["matInput"],features:[ve([{provide:ki,useExisting:n}]),Ge]})}return n})(),Te=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=we({type:n});static \u0275inj=ke({imports:[he,he,Gr,Fe]})}return n})();function Xd(n,s){if(n&1&&(o(0,"p",5),l(1),a()),n&2){let e=u();d(),v(e.data.description)}}function Jd(n,s){if(n&1&&(o(0,"button",10),l(1),a()),n&2){let e=u(),t=Y(1);g("disabled",!t.valid),d(),v(e.data.confirmBtnText)}}var zr=(()=>{class n{dialogRef=m(Ct);data=m(dt);saveName(){this.dialogRef.close(this.data)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["dialog-name"]],decls:20,vars:7,consts:[["name","ngForm"],["name","name",3,"ngSubmit"],[1,"dialogue-header"],["mat-dialog-title",""],["mat-icon-button","",1,"dialog-close-icon",3,"mat-dialog-close"],[1,"dialog-description"],[1,"field-margin"],["matInput","","type","text","id","name","placeholder","Name","name","name","required","","cdkFocusInitial","",3,"ngModelChange","ngModel"],["align","end"],["mat-flat-button","",3,"mat-dialog-close"],["mat-flat-button","","type","submit",3,"disabled"]],template:function(t,i){if(t&1){let r=P();o(0,"form",1,0),C("ngSubmit",function(){return i.saveName()}),o(2,"div",2)(3,"h5",3),l(4),a(),o(5,"button",4)(6,"mat-icon"),l(7,"close"),a()()(),o(8,"mat-dialog-content"),h(9,Xd,2,1,"p",5),o(10,"mat-form-field",6)(11,"mat-label"),l(12,"Name"),a(),o(13,"input",7),li("ngModelChange",function(p){return y(r),ri(i.data.name,p)||(i.data.name=p),x(p)}),a(),o(14,"mat-error"),l(15," A name is required "),a()()(),o(16,"mat-dialog-actions",8)(17,"button",9),l(18),a(),h(19,Jd,2,2,"button",10),a()()}t&2&&(d(4),v(i.data.title),d(),g("mat-dialog-close",!1),d(4),f(i.data.description?9:-1),d(4),oi("ngModel",i.data.name),d(4),g("mat-dialog-close",!1),d(),v(i.data.cancelBtnText),d(),f(i.data.confirmBtnText?19:-1))},dependencies:[Xe,yt,xt,qt,kt,de,K,he,te,Z,gt,Te,ge,se,Se,le,$e,_i,fe,Q,ce,Me,un,jt],styles:[".dialogue-header[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:baseline}.dialog-close-icon[_ngcontent-%COMP%]{margin-right:15px}.mat-mdc-dialog-content[_ngcontent-%COMP%]{max-height:max-content}.field-margin[_ngcontent-%COMP%]{margin-left:15px;margin-bottom:15px}.dialog-description[_ngcontent-%COMP%]{margin:0 15px 15px}"]})}return n})();var nc=["trigger"],ac=["panel"],oc=[[["mat-select-trigger"]],"*"],rc=["mat-select-trigger","*"];function lc(n,s){if(n&1&&(o(0,"span",4),l(1),a()),n&2){let e=u();d(),v(e.placeholder)}}function sc(n,s){n&1&&re(0)}function dc(n,s){if(n&1&&(o(0,"span",11),l(1),a()),n&2){let e=u(2);d(),v(e.triggerValue)}}function cc(n,s){if(n&1&&(o(0,"span",5),h(1,sc,1,0)(2,dc,2,1,"span",11),a()),n&2){let e=u();d(),f(e.customTrigger?1:2)}}function mc(n,s){if(n&1){let e=P();o(0,"div",12,1),C("keydown",function(i){y(e);let r=u();return x(r._handleKeydown(i))}),re(2,1),a()}if(n&2){let e=u();Ue(e.panelClass),G("mat-select-panel-animations-enabled",!e._animationsDisabled)("mat-primary",(e._parentFormField==null?null:e._parentFormField.color)==="primary")("mat-accent",(e._parentFormField==null?null:e._parentFormField.color)==="accent")("mat-warn",(e._parentFormField==null?null:e._parentFormField.color)==="warn")("mat-undefined",!(e._parentFormField!=null&&e._parentFormField.color)),$("id",e.id+"-panel")("aria-multiselectable",e.multiple)("aria-label",e.ariaLabel||null)("aria-labelledby",e._getPanelAriaLabelledby())}}var pc=new H("mat-select-scroll-strategy",{providedIn:"root",factory:()=>{let n=m(_t);return()=>sn(n)}}),uc=new H("MAT_SELECT_CONFIG"),hc=new H("MatSelectTrigger"),_a=class{source;value;constructor(s,e){this.source=s,this.value=e}},Ee=(()=>{class n{_viewportRuler=m(ui);_changeDetectorRef=m(Oe);_elementRef=m(X);_dir=m(Dt,{optional:!0});_idGenerator=m(ye);_renderer=m(Be);_parentFormField=m(Xt,{optional:!0});ngControl=m(pn,{self:!0,optional:!0});_liveAnnouncer=m(fo);_defaultOptions=m(uc,{optional:!0});_animationsDisabled=Ie();_popoverLocation;_initialized=new me;_cleanupDetach;options;optionGroups;customTrigger;_positions=[{originX:"start",originY:"bottom",overlayX:"start",overlayY:"top"},{originX:"end",originY:"bottom",overlayX:"end",overlayY:"top"},{originX:"start",originY:"top",overlayX:"start",overlayY:"bottom",panelClass:"mat-mdc-select-panel-above"},{originX:"end",originY:"top",overlayX:"end",overlayY:"bottom",panelClass:"mat-mdc-select-panel-above"}];_scrollOptionIntoView(e){let t=this.options.toArray()[e];if(t){let i=this.panel.nativeElement,r=bn(e,this.options,this.optionGroups),c=t._getHostElement();e===0&&r===1?i.scrollTop=0:i.scrollTop=vn(c.offsetTop,c.offsetHeight,i.scrollTop,i.offsetHeight)}}_positioningSettled(){this._scrollOptionIntoView(this._keyManager.activeItemIndex||0)}_getChangeEvent(e){return new _a(this,e)}_scrollStrategyFactory=m(pc);_panelOpen=!1;_compareWith=(e,t)=>e===t;_uid=this._idGenerator.getId("mat-select-");_triggerAriaLabelledBy=null;_previousControl;_destroy=new me;_errorStateTracker;stateChanges=new me;disableAutomaticLabeling=!0;userAriaDescribedBy;_selectionModel;_keyManager;_preferredOverlayOrigin;_overlayWidth;_onChange=()=>{};_onTouched=()=>{};_valueId=this._idGenerator.getId("mat-select-value-");_scrollStrategy;_overlayPanelClass=this._defaultOptions?.overlayPanelClass||"";get focused(){return this._focused||this._panelOpen}_focused=!1;controlType="mat-select";trigger;panel;_overlayDir;panelClass;disabled=!1;get disableRipple(){return this._disableRipple()}set disableRipple(e){this._disableRipple.set(e)}_disableRipple=T(!1);tabIndex=0;get hideSingleSelectionIndicator(){return this._hideSingleSelectionIndicator}set hideSingleSelectionIndicator(e){this._hideSingleSelectionIndicator=e,this._syncParentProperties()}_hideSingleSelectionIndicator=this._defaultOptions?.hideSingleSelectionIndicator??!1;get placeholder(){return this._placeholder}set placeholder(e){this._placeholder=e,this.stateChanges.next()}_placeholder;get required(){return this._required??this.ngControl?.control?.hasValidator(z.required)??!1}set required(e){this._required=e,this.stateChanges.next()}_required;get multiple(){return this._multiple}set multiple(e){this._selectionModel,this._multiple=e}_multiple=!1;disableOptionCentering=this._defaultOptions?.disableOptionCentering??!1;get compareWith(){return this._compareWith}set compareWith(e){this._compareWith=e,this._selectionModel&&this._initializeSelection()}get value(){return this._value}set value(e){this._assignValue(e)&&this._onChange(e)}_value;ariaLabel="";ariaLabelledby;get errorStateMatcher(){return this._errorStateTracker.matcher}set errorStateMatcher(e){this._errorStateTracker.matcher=e}typeaheadDebounceInterval;sortComparator;get id(){return this._id}set id(e){this._id=e||this._uid,this.stateChanges.next()}_id;get errorState(){return this._errorStateTracker.errorState}set errorState(e){this._errorStateTracker.errorState=e}panelWidth=this._defaultOptions&&typeof this._defaultOptions.panelWidth<"u"?this._defaultOptions.panelWidth:"auto";canSelectNullableOptions=this._defaultOptions?.canSelectNullableOptions??!1;optionSelectionChanges=Hi(()=>{let e=this.options;return e?e.changes.pipe(Ke(e),Et(()=>De(...e.map(t=>t.onSelectionChange)))):this._initialized.pipe(Et(()=>this.optionSelectionChanges))});openedChange=new j;_openedStream=this.openedChange.pipe(rt(e=>e),at(()=>{}));_closedStream=this.openedChange.pipe(rt(e=>!e),at(()=>{}));selectionChange=new j;valueChange=new j;constructor(){let e=m(hn),t=m(jt,{optional:!0}),i=m(U,{optional:!0}),r=m(new At("tabindex"),{optional:!0}),c=m(wo,{optional:!0});this.ngControl&&(this.ngControl.valueAccessor=this),this._defaultOptions?.typeaheadDebounceInterval!=null&&(this.typeaheadDebounceInterval=this._defaultOptions.typeaheadDebounceInterval),this._errorStateTracker=new fn(e,this.ngControl,i,t,this.stateChanges),this._scrollStrategy=this._scrollStrategyFactory(),this.tabIndex=r==null?0:parseInt(r)||0,this._popoverLocation=c?.usePopover===!1?null:"inline",this.id=this.id}ngOnInit(){this._selectionModel=new Ro(this.multiple),this.stateChanges.next(),this._viewportRuler.change().pipe(Qe(this._destroy)).subscribe(()=>{this.panelOpen&&(this._overlayWidth=this._getOverlayWidth(this._preferredOverlayOrigin),this._changeDetectorRef.detectChanges())})}ngAfterContentInit(){this._initialized.next(),this._initialized.complete(),this._initKeyManager(),this._selectionModel.changed.pipe(Qe(this._destroy)).subscribe(e=>{e.added.forEach(t=>t.select()),e.removed.forEach(t=>t.deselect())}),this.options.changes.pipe(Ke(null),Qe(this._destroy)).subscribe(()=>{this._resetOptions(),this._initializeSelection()})}ngDoCheck(){let e=this._getTriggerAriaLabelledby(),t=this.ngControl;if(e!==this._triggerAriaLabelledBy){let i=this._elementRef.nativeElement;this._triggerAriaLabelledBy=e,e?i.setAttribute("aria-labelledby",e):i.removeAttribute("aria-labelledby")}t&&(this._previousControl!==t.control&&(this._previousControl!==void 0&&t.disabled!==null&&t.disabled!==this.disabled&&(this.disabled=t.disabled),this._previousControl=t.control),this.updateErrorState())}ngOnChanges(e){(e.disabled||e.userAriaDescribedBy)&&this.stateChanges.next(),e.typeaheadDebounceInterval&&this._keyManager&&this._keyManager.withTypeAhead(this.typeaheadDebounceInterval),e.panelClass&&this.panelClass instanceof Set&&(this.panelClass=Array.from(this.panelClass))}ngOnDestroy(){this._cleanupDetach?.(),this._keyManager?.destroy(),this._destroy.next(),this._destroy.complete(),this.stateChanges.complete(),this._clearFromModal()}toggle(){this.panelOpen?this.close():this.open()}open(){this._canOpen()&&(this._parentFormField&&(this._preferredOverlayOrigin=this._parentFormField.getConnectedOverlayOrigin()),this._cleanupDetach?.(),this._overlayWidth=this._getOverlayWidth(this._preferredOverlayOrigin),this._applyModalPanelOwnership(),this._panelOpen=!0,this._overlayDir.positionChange.pipe(ji(1)).subscribe(()=>{this._changeDetectorRef.detectChanges(),this._positioningSettled()}),this._overlayDir.attachOverlay(),this._keyManager.withHorizontalOrientation(null),this._highlightCorrectOption(),this._changeDetectorRef.markForCheck(),this.stateChanges.next(),Promise.resolve().then(()=>this.openedChange.emit(!0)))}_trackedModal=null;_applyModalPanelOwnership(){let e=this._elementRef.nativeElement.closest('body > .cdk-overlay-container [aria-modal="true"]');if(!e)return;let t=`${this.id}-panel`;this._trackedModal&&si(this._trackedModal,"aria-owns",t),Gi(e,"aria-owns",t),this._trackedModal=e}_clearFromModal(){if(!this._trackedModal)return;let e=`${this.id}-panel`;si(this._trackedModal,"aria-owns",e),this._trackedModal=null}close(){this._panelOpen&&(this._panelOpen=!1,this._exitAndDetach(),this._keyManager.withHorizontalOrientation(this._isRtl()?"rtl":"ltr"),this._changeDetectorRef.markForCheck(),this._onTouched(),this.stateChanges.next(),Promise.resolve().then(()=>this.openedChange.emit(!1)))}_exitAndDetach(){if(this._animationsDisabled||!this.panel){this._detachOverlay();return}this._cleanupDetach?.(),this._cleanupDetach=()=>{t(),clearTimeout(i),this._cleanupDetach=void 0};let e=this.panel.nativeElement,t=this._renderer.listen(e,"animationend",r=>{r.animationName==="_mat-select-exit"&&(this._cleanupDetach?.(),this._detachOverlay())}),i=setTimeout(()=>{this._cleanupDetach?.(),this._detachOverlay()},200);e.classList.add("mat-select-panel-exit")}_detachOverlay(){this._overlayDir.detachOverlay(),this._changeDetectorRef.markForCheck()}writeValue(e){this._assignValue(e)}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}setDisabledState(e){this.disabled=e,this._changeDetectorRef.markForCheck(),this.stateChanges.next()}get panelOpen(){return this._panelOpen}get selected(){return this.multiple?this._selectionModel?.selected||[]:this._selectionModel?.selected[0]}get triggerValue(){if(this.empty)return"";if(this._multiple){let e=this._selectionModel.selected.map(t=>t.viewValue);return this._isRtl()&&e.reverse(),e.join(", ")}return this._selectionModel.selected[0].viewValue}updateErrorState(){this._errorStateTracker.updateErrorState()}_isRtl(){return this._dir?this._dir.value==="rtl":!1}_handleKeydown(e){this.disabled||(this.panelOpen?this._handleOpenKeydown(e):this._handleClosedKeydown(e))}_handleClosedKeydown(e){let t=e.keyCode,i=t===40||t===38||t===37||t===39,r=t===13||t===32,c=this._keyManager;if(!c.isTyping()&&r&&!vt(e)||(this.multiple||e.altKey)&&i)e.preventDefault(),this.open();else if(!this.multiple){let p=this.selected;c.onKeydown(e);let _=this.selected;_&&p!==_&&this._liveAnnouncer.announce(_.viewValue,1e4)}}_handleOpenKeydown(e){let t=this._keyManager,i=e.keyCode,r=i===40||i===38,c=t.isTyping();if(r&&e.altKey)e.preventDefault(),this.close();else if(!c&&(i===13||i===32)&&t.activeItem&&!vt(e))e.preventDefault(),t.activeItem._selectViaInteraction();else if(!c&&this._multiple&&i===65&&e.ctrlKey){e.preventDefault();let p=this.options.some(_=>!_.disabled&&!_.selected);this.options.forEach(_=>{_.disabled||(p?_.select():_.deselect())})}else{let p=t.activeItemIndex;t.onKeydown(e),this._multiple&&r&&e.shiftKey&&t.activeItem&&t.activeItemIndex!==p&&t.activeItem._selectViaInteraction()}}_handleOverlayKeydown(e){e.keyCode===27&&!vt(e)&&(e.preventDefault(),this.close())}_onFocus(){this.disabled||(this._focused=!0,this.stateChanges.next())}_onBlur(){this._focused=!1,this._keyManager?.cancelTypeahead(),!this.disabled&&!this.panelOpen&&(this._onTouched(),this._changeDetectorRef.markForCheck(),this.stateChanges.next())}get empty(){return!this._selectionModel||this._selectionModel.isEmpty()}_initializeSelection(){Promise.resolve().then(()=>{this.ngControl&&(this._value=this.ngControl.value),this._setSelectionByValue(this._value),this.stateChanges.next()})}_setSelectionByValue(e){if(this.options.forEach(t=>t.setInactiveStyles()),this._selectionModel.clear(),this.multiple&&e)Array.isArray(e),e.forEach(t=>this._selectOptionByValue(t)),this._sortValues();else{let t=this._selectOptionByValue(e);t?this._keyManager.updateActiveItem(t):this.panelOpen||this._keyManager.updateActiveItem(-1)}this._changeDetectorRef.markForCheck()}_selectOptionByValue(e){let t=this.options.find(i=>{if(this._selectionModel.isSelected(i))return!1;try{return(i.value!=null||this.canSelectNullableOptions)&&this._compareWith(i.value,e)}catch(r){return!1}});return t&&this._selectionModel.select(t),t}_assignValue(e){return e!==this._value||this._multiple&&Array.isArray(e)?(this.options&&this._setSelectionByValue(e),this._value=e,!0):!1}_skipPredicate=e=>this.panelOpen?!1:e.disabled;_getOverlayWidth(e){return this.panelWidth==="auto"?(e instanceof Jn?e.elementRef:e||this._elementRef).nativeElement.getBoundingClientRect().width:this.panelWidth===null?"":this.panelWidth}_syncParentProperties(){if(this.options)for(let e of this.options)e._changeDetectorRef.markForCheck()}_initKeyManager(){this._keyManager=new on(this.options).withTypeAhead(this.typeaheadDebounceInterval).withVerticalOrientation().withHorizontalOrientation(this._isRtl()?"rtl":"ltr").withHomeAndEnd().withPageUpDown().withAllowedModifierKeys(["shiftKey"]).skipPredicate(this._skipPredicate),this._keyManager.tabOut.subscribe(()=>{this.panelOpen&&(!this.multiple&&this._keyManager.activeItem&&this._keyManager.activeItem._selectViaInteraction(),this.focus(),this.close())}),this._keyManager.change.subscribe(()=>{this._panelOpen&&this.panel?this._scrollOptionIntoView(this._keyManager.activeItemIndex||0):!this._panelOpen&&!this.multiple&&this._keyManager.activeItem&&this._keyManager.activeItem._selectViaInteraction()})}_resetOptions(){let e=De(this.options.changes,this._destroy);this.optionSelectionChanges.pipe(Qe(e)).subscribe(t=>{this._onSelect(t.source,t.isUserInput),t.isUserInput&&!this.multiple&&this._panelOpen&&(this.close(),this.focus())}),De(...this.options.map(t=>t._stateChanges)).pipe(Qe(e)).subscribe(()=>{this._changeDetectorRef.detectChanges(),this.stateChanges.next()})}_onSelect(e,t){let i=this._selectionModel.isSelected(e);!this.canSelectNullableOptions&&e.value==null&&!this._multiple?(e.deselect(),this._selectionModel.clear(),this.value!=null&&this._propagateChanges(e.value)):(i!==e.selected&&(e.selected?this._selectionModel.select(e):this._selectionModel.deselect(e)),t&&this._keyManager.setActiveItem(e),this.multiple&&(this._sortValues(),t&&this.focus())),i!==this._selectionModel.isSelected(e)&&this._propagateChanges(),this.stateChanges.next()}_sortValues(){if(this.multiple){let e=this.options.toArray();this._selectionModel.sort((t,i)=>this.sortComparator?this.sortComparator(t,i,e):e.indexOf(t)-e.indexOf(i)),this.stateChanges.next()}}_propagateChanges(e){let t;this.multiple?t=this.selected.map(i=>i.value):t=this.selected?this.selected.value:e,this._value=t,this.valueChange.emit(t),this._onChange(t),this.selectionChange.emit(this._getChangeEvent(t)),this._changeDetectorRef.markForCheck()}_highlightCorrectOption(){if(this._keyManager)if(this.empty){let e=-1;for(let t=0;t<this.options.length;t++)if(!this.options.get(t).disabled){e=t;break}this._keyManager.setActiveItem(e)}else this._keyManager.setActiveItem(this._selectionModel.selected[0])}_canOpen(){return!this._panelOpen&&!this.disabled&&this.options?.length>0&&!!this._overlayDir}focus(e){this._elementRef.nativeElement.focus(e)}_getPanelAriaLabelledby(){if(this.ariaLabel)return null;let e=this._parentFormField?.getLabelId()||null,t=e?e+" ":"";return this.ariaLabelledby?t+this.ariaLabelledby:e}_getAriaActiveDescendant(){return this.panelOpen&&this._keyManager&&this._keyManager.activeItem?this._keyManager.activeItem.id:null}_getTriggerAriaLabelledby(){if(this.ariaLabel)return null;let e=this._parentFormField?.getLabelId()||"";return this.ariaLabelledby&&(e+=" "+this.ariaLabelledby),e||(e=this._valueId),e}get describedByIds(){return this._elementRef.nativeElement.getAttribute("aria-describedby")?.split(" ")||[]}setDescribedByIds(e){let t=this._elementRef.nativeElement;e.length?t.setAttribute("aria-describedby",e.join(" ")):t.removeAttribute("aria-describedby")}onContainerClick(e){let t=an(e);t&&(t.tagName==="MAT-OPTION"||t.classList.contains("cdk-overlay-backdrop")||t.closest(".mat-mdc-select-panel"))||(this.focus(),this.open())}get shouldLabelFloat(){return this.panelOpen||!this.empty||this.focused&&!!this.placeholder}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["mat-select"]],contentQueries:function(t,i,r){if(t&1&&lt(r,hc,5)(r,ee,5)(r,_n,5),t&2){let c;O(c=F())&&(i.customTrigger=c.first),O(c=F())&&(i.options=c),O(c=F())&&(i.optionGroups=c)}},viewQuery:function(t,i){if(t&1&&Pe(nc,5)(ac,5)(ea,5),t&2){let r;O(r=F())&&(i.trigger=r.first),O(r=F())&&(i.panel=r.first),O(r=F())&&(i._overlayDir=r.first)}},hostAttrs:["role","combobox","aria-haspopup","listbox",1,"mat-mdc-select"],hostVars:21,hostBindings:function(t,i){t&1&&C("keydown",function(c){return i._handleKeydown(c)})("focus",function(){return i._onFocus()})("blur",function(){return i._onBlur()}),t&2&&($("id",i.id)("tabindex",i.disabled?-1:i.tabIndex)("aria-controls",i.panelOpen?i.id+"-panel":null)("aria-expanded",i.panelOpen)("aria-label",i.ariaLabel||null)("aria-required",i.required.toString())("aria-disabled",i.disabled.toString())("aria-invalid",i.errorState)("aria-activedescendant",i._getAriaActiveDescendant()),G("mat-mdc-select-disabled",i.disabled)("mat-mdc-select-invalid",i.errorState)("mat-mdc-select-required",i.required)("mat-mdc-select-empty",i.empty)("mat-mdc-select-multiple",i.multiple)("mat-select-open",i.panelOpen))},inputs:{userAriaDescribedBy:[0,"aria-describedby","userAriaDescribedBy"],panelClass:"panelClass",disabled:[2,"disabled","disabled",D],disableRipple:[2,"disableRipple","disableRipple",D],tabIndex:[2,"tabIndex","tabIndex",e=>e==null?0:Ze(e)],hideSingleSelectionIndicator:[2,"hideSingleSelectionIndicator","hideSingleSelectionIndicator",D],placeholder:"placeholder",required:[2,"required","required",D],multiple:[2,"multiple","multiple",D],disableOptionCentering:[2,"disableOptionCentering","disableOptionCentering",D],compareWith:"compareWith",value:"value",ariaLabel:[0,"aria-label","ariaLabel"],ariaLabelledby:[0,"aria-labelledby","ariaLabelledby"],errorStateMatcher:"errorStateMatcher",typeaheadDebounceInterval:[2,"typeaheadDebounceInterval","typeaheadDebounceInterval",Ze],sortComparator:"sortComparator",id:"id",panelWidth:"panelWidth",canSelectNullableOptions:[2,"canSelectNullableOptions","canSelectNullableOptions",D]},outputs:{openedChange:"openedChange",_openedStream:"opened",_closedStream:"closed",selectionChange:"selectionChange",valueChange:"valueChange"},exportAs:["matSelect"],features:[ve([{provide:ki,useExisting:n},{provide:gn,useExisting:n}]),Ge],ngContentSelectors:rc,decls:11,vars:10,consts:[["fallbackOverlayOrigin","cdkOverlayOrigin","trigger",""],["panel",""],["cdk-overlay-origin","",1,"mat-mdc-select-trigger",3,"click"],[1,"mat-mdc-select-value"],[1,"mat-mdc-select-placeholder","mat-mdc-select-min-line"],[1,"mat-mdc-select-value-text"],[1,"mat-mdc-select-arrow-wrapper"],[1,"mat-mdc-select-arrow"],["viewBox","0 0 24 24","width","24px","height","24px","focusable","false","aria-hidden","true"],["d","M7 10l5 5 5-5z"],["cdk-connected-overlay","","cdkConnectedOverlayHasBackdrop","","cdkConnectedOverlayBackdropClass","cdk-overlay-transparent-backdrop",3,"detach","backdropClick","overlayKeydown","cdkConnectedOverlayDisableClose","cdkConnectedOverlayPanelClass","cdkConnectedOverlayScrollStrategy","cdkConnectedOverlayOrigin","cdkConnectedOverlayPositions","cdkConnectedOverlayWidth","cdkConnectedOverlayFlexibleDimensions","cdkConnectedOverlayUsePopover"],[1,"mat-mdc-select-min-line"],["role","listbox","tabindex","-1",1,"mat-mdc-select-panel","mdc-menu-surface","mdc-menu-surface--open",3,"keydown"]],template:function(t,i){if(t&1&&(Ne(oc),o(0,"div",2,0),C("click",function(){return i.open()}),o(3,"div",3),h(4,lc,2,1,"span",4)(5,cc,3,1,"span",5),a(),o(6,"div",6)(7,"div",7),mi(),o(8,"svg",8),b(9,"path",9),a()()()(),ze(10,mc,3,16,"ng-template",10),C("detach",function(){return i.close()})("backdropClick",function(){return i.close()})("overlayKeydown",function(c){return i._handleOverlayKeydown(c)})),t&2){let r=Y(1);d(3),$("id",i._valueId),d(),f(i.empty?4:5),d(6),g("cdkConnectedOverlayDisableClose",!0)("cdkConnectedOverlayPanelClass",i._overlayPanelClass)("cdkConnectedOverlayScrollStrategy",i._scrollStrategy)("cdkConnectedOverlayOrigin",i._preferredOverlayOrigin||r)("cdkConnectedOverlayPositions",i._positions)("cdkConnectedOverlayWidth",i._overlayWidth)("cdkConnectedOverlayFlexibleDimensions",!0)("cdkConnectedOverlayUsePopover",i._popoverLocation)}},dependencies:[Jn,ea],styles:[`@keyframes _mat-select-enter {
  from {
    opacity: 0;
    transform: scaleY(0.8);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes _mat-select-exit {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
.mat-mdc-select {
  display: inline-block;
  width: 100%;
  outline: none;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  color: var(--mat-select-enabled-trigger-text-color, var(--mat-sys-on-surface));
  font-family: var(--mat-select-trigger-text-font, var(--mat-sys-body-large-font));
  line-height: var(--mat-select-trigger-text-line-height, var(--mat-sys-body-large-line-height));
  font-size: var(--mat-select-trigger-text-size, var(--mat-sys-body-large-size));
  font-weight: var(--mat-select-trigger-text-weight, var(--mat-sys-body-large-weight));
  letter-spacing: var(--mat-select-trigger-text-tracking, var(--mat-sys-body-large-tracking));
}

div.mat-mdc-select-panel {
  box-shadow: var(--mat-select-container-elevation-shadow, 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12));
}

.mat-mdc-select-disabled {
  color: var(--mat-select-disabled-trigger-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-mdc-select-disabled .mat-mdc-select-placeholder {
  color: var(--mat-select-disabled-trigger-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}

.mat-mdc-select-trigger {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  box-sizing: border-box;
  width: 100%;
}
.mat-mdc-select-disabled .mat-mdc-select-trigger {
  -webkit-user-select: none;
  user-select: none;
  cursor: default;
}

.mat-mdc-select-value {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mat-mdc-select-value-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mat-mdc-select-arrow-wrapper {
  height: 24px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}
.mat-form-field-appearance-fill .mdc-text-field--no-label .mat-mdc-select-arrow-wrapper {
  transform: none;
}

.mat-mdc-form-field .mat-mdc-select.mat-mdc-select-invalid .mat-mdc-select-arrow,
.mat-form-field-invalid:not(.mat-form-field-disabled) .mat-mdc-form-field-infix::after {
  color: var(--mat-select-invalid-arrow-color, var(--mat-sys-error));
}

.mat-mdc-select-arrow {
  width: 10px;
  height: 5px;
  position: relative;
  color: var(--mat-select-enabled-arrow-color, var(--mat-sys-on-surface-variant));
}
.mat-mdc-form-field.mat-focused .mat-mdc-select-arrow {
  color: var(--mat-select-focused-arrow-color, var(--mat-sys-primary));
}
.mat-mdc-form-field .mat-mdc-select.mat-mdc-select-disabled .mat-mdc-select-arrow {
  color: var(--mat-select-disabled-arrow-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-select-open .mat-mdc-select-arrow {
  transform: rotate(180deg);
}
.mat-form-field-animations-enabled .mat-mdc-select-arrow {
  transition: transform 80ms linear;
}
.mat-mdc-select-arrow svg {
  fill: currentColor;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
@media (forced-colors: active) {
  .mat-mdc-select-arrow svg {
    fill: CanvasText;
  }
  .mat-mdc-select-disabled .mat-mdc-select-arrow svg {
    fill: GrayText;
  }
}

div.mat-mdc-select-panel {
  width: 100%;
  max-height: 275px;
  outline: 0;
  overflow: auto;
  padding: 8px 0;
  border-radius: 4px;
  box-sizing: border-box;
  position: relative;
  background-color: var(--mat-select-panel-background-color, var(--mat-sys-surface-container));
}
@media (forced-colors: active) {
  div.mat-mdc-select-panel {
    outline: solid 1px;
  }
}
.cdk-overlay-pane:not(.mat-mdc-select-panel-above) div.mat-mdc-select-panel {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  transform-origin: top center;
}
.mat-mdc-select-panel-above div.mat-mdc-select-panel {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  transform-origin: bottom center;
}

.mat-select-panel-animations-enabled {
  animation: _mat-select-enter 120ms cubic-bezier(0, 0, 0.2, 1);
}
.mat-select-panel-animations-enabled.mat-select-panel-exit {
  animation: _mat-select-exit 100ms linear;
}

.mat-mdc-select-placeholder {
  transition: color 400ms 133.3333333333ms cubic-bezier(0.25, 0.8, 0.25, 1);
  color: var(--mat-select-placeholder-text-color, var(--mat-sys-on-surface-variant));
}
.mat-mdc-form-field:not(.mat-form-field-animations-enabled) .mat-mdc-select-placeholder, ._mat-animation-noopable .mat-mdc-select-placeholder {
  transition: none;
}
.mat-form-field-hide-placeholder .mat-mdc-select-placeholder {
  color: transparent;
  -webkit-text-fill-color: transparent;
  transition: none;
  display: block;
}

.mat-mdc-form-field-type-mat-select:not(.mat-form-field-disabled) .mat-mdc-text-field-wrapper {
  cursor: pointer;
}
.mat-mdc-form-field-type-mat-select.mat-form-field-appearance-fill .mat-mdc-floating-label {
  max-width: calc(100% - 18px);
}
.mat-mdc-form-field-type-mat-select.mat-form-field-appearance-fill .mdc-floating-label--float-above {
  max-width: calc(100% / 0.75 - 24px);
}
.mat-mdc-form-field-type-mat-select.mat-form-field-appearance-outline .mdc-notched-outline__notch {
  max-width: calc(100% - 60px);
}
.mat-mdc-form-field-type-mat-select.mat-form-field-appearance-outline .mdc-text-field--label-floating .mdc-notched-outline__notch {
  max-width: calc(100% - 24px);
}

.mat-mdc-select-min-line:empty::before {
  content: " ";
  white-space: pre;
  width: 1px;
  display: inline-block;
  visibility: hidden;
}

.mat-form-field-appearance-fill .mat-mdc-select-arrow-wrapper {
  transform: var(--mat-select-arrow-transform, translateY(-8px));
}
`],encapsulation:2,changeDetection:0})}return n})();var qe=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=we({type:n});static \u0275inj=ke({imports:[dn,Zt,Fe,rn,he,Zt]})}return n})();var fc=["input"],gc=["label"],_c=["*"],ba={color:"accent",clickAction:"check-indeterminate",disabledInteractive:!1},bc=new H("mat-checkbox-default-options",{providedIn:"root",factory:()=>ba}),He=(function(n){return n[n.Init=0]="Init",n[n.Checked=1]="Checked",n[n.Unchecked=2]="Unchecked",n[n.Indeterminate=3]="Indeterminate",n})(He||{}),va=class{source;checked},Ae=(()=>{class n{_elementRef=m(X);_changeDetectorRef=m(Oe);_ngZone=m(ae);_animationsDisabled=Ie();_options=m(bc,{optional:!0});focus(){this._inputElement.nativeElement.focus()}_createChangeEvent(e){let t=new va;return t.source=this,t.checked=e,t}_getAnimationTargetElement(){return this._inputElement?.nativeElement}_animationClasses={uncheckedToChecked:"mdc-checkbox--anim-unchecked-checked",uncheckedToIndeterminate:"mdc-checkbox--anim-unchecked-indeterminate",checkedToUnchecked:"mdc-checkbox--anim-checked-unchecked",checkedToIndeterminate:"mdc-checkbox--anim-checked-indeterminate",indeterminateToChecked:"mdc-checkbox--anim-indeterminate-checked",indeterminateToUnchecked:"mdc-checkbox--anim-indeterminate-unchecked"};ariaLabel="";ariaLabelledby=null;ariaDescribedby;ariaExpanded;ariaControls;ariaOwns;_uniqueId;id;get inputId(){return`${this.id||this._uniqueId}-input`}required=!1;labelPosition="after";name=null;change=new j;indeterminateChange=new j;value;disableRipple=!1;_inputElement;_labelElement;tabIndex;color;disabledInteractive;_onTouched=()=>{};_currentAnimationClass="";_currentCheckState=He.Init;_controlValueAccessorChangeFn=()=>{};_validatorChangeFn=()=>{};constructor(){m(st).load($t);let e=m(new At("tabindex"),{optional:!0});this._options=this._options||ba,this.color=this._options.color||ba.color,this.tabIndex=e==null?0:parseInt(e)||0,this.id=this._uniqueId=m(ye).getId("mat-mdc-checkbox-"),this.disabledInteractive=this._options?.disabledInteractive??!1}ngOnChanges(e){e.required&&this._validatorChangeFn()}ngAfterViewInit(){this._syncIndeterminate(this.indeterminate)}get checked(){return this._checked}set checked(e){e!=this.checked&&(this._checked=e,this._changeDetectorRef.markForCheck())}_checked=!1;get disabled(){return this._disabled}set disabled(e){e!==this.disabled&&(this._disabled=e,this._changeDetectorRef.markForCheck())}_disabled=!1;get indeterminate(){return this._indeterminate()}set indeterminate(e){let t=e!=this._indeterminate();this._indeterminate.set(e),t&&(e?this._transitionCheckState(He.Indeterminate):this._transitionCheckState(this.checked?He.Checked:He.Unchecked),this.indeterminateChange.emit(e)),this._syncIndeterminate(e)}_indeterminate=T(!1);_isRippleDisabled(){return this.disableRipple||this.disabled}_onLabelTextChange(){this._changeDetectorRef.detectChanges()}writeValue(e){this.checked=!!e}registerOnChange(e){this._controlValueAccessorChangeFn=e}registerOnTouched(e){this._onTouched=e}setDisabledState(e){this.disabled=e}validate(e){return this.required&&e.value!==!0?{required:!0}:null}registerOnValidatorChange(e){this._validatorChangeFn=e}_transitionCheckState(e){let t=this._currentCheckState,i=this._getAnimationTargetElement();if(!(t===e||!i)&&(this._currentAnimationClass&&i.classList.remove(this._currentAnimationClass),this._currentAnimationClass=this._getAnimationClassForCheckStateTransition(t,e),this._currentCheckState=e,this._currentAnimationClass.length>0)){i.classList.add(this._currentAnimationClass);let r=this._currentAnimationClass;this._ngZone.runOutsideAngular(()=>{setTimeout(()=>{i.classList.remove(r)},1e3)})}}_emitChangeEvent(){this._controlValueAccessorChangeFn(this.checked),this.change.emit(this._createChangeEvent(this.checked)),this._inputElement&&(this._inputElement.nativeElement.checked=this.checked)}toggle(){this.checked=!this.checked,this._controlValueAccessorChangeFn(this.checked)}_handleInputClick(){let e=this._options?.clickAction;!this.disabled&&e!=="noop"?(this.indeterminate&&e!=="check"&&Promise.resolve().then(()=>{this._indeterminate.set(!1),this.indeterminateChange.emit(!1)}),this._checked=!this._checked,this._transitionCheckState(this._checked?He.Checked:He.Unchecked),this._emitChangeEvent()):(this.disabled&&this.disabledInteractive||!this.disabled&&e==="noop")&&(this._inputElement.nativeElement.checked=this.checked,this._inputElement.nativeElement.indeterminate=this.indeterminate)}_onInteractionEvent(e){e.stopPropagation()}_onBlur(){Promise.resolve().then(()=>{this._onTouched(),this._changeDetectorRef.markForCheck()})}_getAnimationClassForCheckStateTransition(e,t){if(this._animationsDisabled)return"";switch(e){case He.Init:if(t===He.Checked)return this._animationClasses.uncheckedToChecked;if(t==He.Indeterminate)return this._checked?this._animationClasses.checkedToIndeterminate:this._animationClasses.uncheckedToIndeterminate;break;case He.Unchecked:return t===He.Checked?this._animationClasses.uncheckedToChecked:this._animationClasses.uncheckedToIndeterminate;case He.Checked:return t===He.Unchecked?this._animationClasses.checkedToUnchecked:this._animationClasses.checkedToIndeterminate;case He.Indeterminate:return t===He.Checked?this._animationClasses.indeterminateToChecked:this._animationClasses.indeterminateToUnchecked}return""}_syncIndeterminate(e){let t=this._inputElement;t&&(t.nativeElement.indeterminate=e)}_onInputClick(){this._handleInputClick()}_onTouchTargetClick(){this._handleInputClick(),this.disabled||this._inputElement.nativeElement.focus()}_preventBubblingFromLabel(e){e.target&&this._labelElement.nativeElement.contains(e.target)&&e.stopPropagation()}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["mat-checkbox"]],viewQuery:function(t,i){if(t&1&&Pe(fc,5)(gc,5),t&2){let r;O(r=F())&&(i._inputElement=r.first),O(r=F())&&(i._labelElement=r.first)}},hostAttrs:[1,"mat-mdc-checkbox"],hostVars:16,hostBindings:function(t,i){t&2&&(ut("id",i.id),$("tabindex",null)("aria-label",null)("aria-labelledby",null),Ue(i.color?"mat-"+i.color:"mat-accent"),G("_mat-animation-noopable",i._animationsDisabled)("mdc-checkbox--disabled",i.disabled)("mat-mdc-checkbox-disabled",i.disabled)("mat-mdc-checkbox-checked",i.checked)("mat-mdc-checkbox-disabled-interactive",i.disabledInteractive))},inputs:{ariaLabel:[0,"aria-label","ariaLabel"],ariaLabelledby:[0,"aria-labelledby","ariaLabelledby"],ariaDescribedby:[0,"aria-describedby","ariaDescribedby"],ariaExpanded:[2,"aria-expanded","ariaExpanded",D],ariaControls:[0,"aria-controls","ariaControls"],ariaOwns:[0,"aria-owns","ariaOwns"],id:"id",required:[2,"required","required",D],labelPosition:"labelPosition",name:"name",value:"value",disableRipple:[2,"disableRipple","disableRipple",D],tabIndex:[2,"tabIndex","tabIndex",e=>e==null?void 0:Ze(e)],color:"color",disabledInteractive:[2,"disabledInteractive","disabledInteractive",D],checked:[2,"checked","checked",D],disabled:[2,"disabled","disabled",D],indeterminate:[2,"indeterminate","indeterminate",D]},outputs:{change:"change",indeterminateChange:"indeterminateChange"},exportAs:["matCheckbox"],features:[ve([{provide:Ht,useExisting:Vt(()=>n),multi:!0},{provide:mn,useExisting:n,multi:!0}]),Ge],ngContentSelectors:_c,decls:15,vars:23,consts:[["checkbox",""],["input",""],["label",""],["mat-internal-form-field","",3,"click","labelPosition"],[1,"mdc-checkbox"],["aria-hidden","true",1,"mat-mdc-checkbox-touch-target",3,"click"],["type","checkbox",1,"mdc-checkbox__native-control",3,"blur","click","change","checked","indeterminate","disabled","id","required","tabIndex"],["aria-hidden","true",1,"mdc-checkbox__ripple"],["aria-hidden","true",1,"mdc-checkbox__background"],["focusable","false","viewBox","0 0 24 24",1,"mdc-checkbox__checkmark"],["fill","none","d","M1.73,12.91 8.1,19.28 22.79,4.59",1,"mdc-checkbox__checkmark-path"],[1,"mdc-checkbox__mixedmark"],["mat-ripple","","aria-hidden","true",1,"mat-mdc-checkbox-ripple","mat-focus-indicator",3,"matRippleTrigger","matRippleDisabled","matRippleCentered"],[1,"mdc-label",3,"for"]],template:function(t,i){if(t&1&&(Ne(),o(0,"div",3),C("click",function(c){return i._preventBubblingFromLabel(c)}),o(1,"div",4,0)(3,"div",5),C("click",function(){return i._onTouchTargetClick()}),a(),o(4,"input",6,1),C("blur",function(){return i._onBlur()})("click",function(){return i._onInputClick()})("change",function(c){return i._onInteractionEvent(c)}),a(),b(6,"div",7),o(7,"div",8),mi(),o(8,"svg",9),b(9,"path",10),a(),La(),b(10,"div",11),a(),b(11,"div",12),a(),o(12,"label",13,2),re(14),a()()),t&2){let r=Y(2);g("labelPosition",i.labelPosition),d(4),G("mdc-checkbox--selected",i.checked),g("checked",i.checked)("indeterminate",i.indeterminate)("disabled",i.disabled&&!i.disabledInteractive)("id",i.inputId)("required",i.required)("tabIndex",i.disabled&&!i.disabledInteractive?-1:i.tabIndex),$("aria-label",i.ariaLabel||null)("aria-labelledby",i.ariaLabelledby)("aria-describedby",i.ariaDescribedby)("aria-checked",i.indeterminate?"mixed":null)("aria-controls",i.ariaControls)("aria-disabled",i.disabled&&i.disabledInteractive?!0:null)("aria-expanded",i.ariaExpanded)("aria-owns",i.ariaOwns)("name",i.name)("value",i.value),d(7),g("matRippleTrigger",r)("matRippleDisabled",i.disableRipple||i.disabled)("matRippleCentered",!0),d(),g("for",i.inputId)}},dependencies:[Pt,yi],styles:[`.mdc-checkbox {
  display: inline-block;
  position: relative;
  flex: 0 0 18px;
  box-sizing: content-box;
  width: 18px;
  height: 18px;
  line-height: 0;
  white-space: nowrap;
  cursor: pointer;
  vertical-align: bottom;
  padding: calc((var(--mat-checkbox-state-layer-size, 40px) - 18px) / 2);
  margin: calc((var(--mat-checkbox-state-layer-size, 40px) - var(--mat-checkbox-state-layer-size, 40px)) / 2);
}
.mdc-checkbox:hover > .mdc-checkbox__ripple {
  opacity: var(--mat-checkbox-unselected-hover-state-layer-opacity, var(--mat-sys-hover-state-layer-opacity));
  background-color: var(--mat-checkbox-unselected-hover-state-layer-color, var(--mat-sys-on-surface));
}
.mdc-checkbox:hover > .mat-mdc-checkbox-ripple > .mat-ripple-element {
  background-color: var(--mat-checkbox-unselected-hover-state-layer-color, var(--mat-sys-on-surface));
}
.mdc-checkbox .mdc-checkbox__native-control:focus + .mdc-checkbox__ripple {
  opacity: var(--mat-checkbox-unselected-focus-state-layer-opacity, var(--mat-sys-focus-state-layer-opacity));
  background-color: var(--mat-checkbox-unselected-focus-state-layer-color, var(--mat-sys-on-surface));
}
.mdc-checkbox .mdc-checkbox__native-control:focus ~ .mat-mdc-checkbox-ripple .mat-ripple-element {
  background-color: var(--mat-checkbox-unselected-focus-state-layer-color, var(--mat-sys-on-surface));
}
.mdc-checkbox:active > .mdc-checkbox__native-control + .mdc-checkbox__ripple {
  opacity: var(--mat-checkbox-unselected-pressed-state-layer-opacity, var(--mat-sys-pressed-state-layer-opacity));
  background-color: var(--mat-checkbox-unselected-pressed-state-layer-color, var(--mat-sys-primary));
}
.mdc-checkbox:active > .mdc-checkbox__native-control ~ .mat-mdc-checkbox-ripple .mat-ripple-element {
  background-color: var(--mat-checkbox-unselected-pressed-state-layer-color, var(--mat-sys-primary));
}
.mdc-checkbox:hover > .mdc-checkbox__native-control:checked + .mdc-checkbox__ripple {
  opacity: var(--mat-checkbox-selected-hover-state-layer-opacity, var(--mat-sys-hover-state-layer-opacity));
  background-color: var(--mat-checkbox-selected-hover-state-layer-color, var(--mat-sys-primary));
}
.mdc-checkbox:hover > .mdc-checkbox__native-control:checked ~ .mat-mdc-checkbox-ripple .mat-ripple-element {
  background-color: var(--mat-checkbox-selected-hover-state-layer-color, var(--mat-sys-primary));
}
.mdc-checkbox .mdc-checkbox__native-control:focus:checked + .mdc-checkbox__ripple {
  opacity: var(--mat-checkbox-selected-focus-state-layer-opacity, var(--mat-sys-focus-state-layer-opacity));
  background-color: var(--mat-checkbox-selected-focus-state-layer-color, var(--mat-sys-primary));
}
.mdc-checkbox .mdc-checkbox__native-control:focus:checked ~ .mat-mdc-checkbox-ripple .mat-ripple-element {
  background-color: var(--mat-checkbox-selected-focus-state-layer-color, var(--mat-sys-primary));
}
.mdc-checkbox:active > .mdc-checkbox__native-control:checked + .mdc-checkbox__ripple {
  opacity: var(--mat-checkbox-selected-pressed-state-layer-opacity, var(--mat-sys-pressed-state-layer-opacity));
  background-color: var(--mat-checkbox-selected-pressed-state-layer-color, var(--mat-sys-on-surface));
}
.mdc-checkbox:active > .mdc-checkbox__native-control:checked ~ .mat-mdc-checkbox-ripple .mat-ripple-element {
  background-color: var(--mat-checkbox-selected-pressed-state-layer-color, var(--mat-sys-on-surface));
}
.mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox .mdc-checkbox__native-control ~ .mat-mdc-checkbox-ripple .mat-ripple-element,
.mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox .mdc-checkbox__native-control + .mdc-checkbox__ripple {
  background-color: var(--mat-checkbox-unselected-hover-state-layer-color, var(--mat-sys-on-surface));
}
.mdc-checkbox .mdc-checkbox__native-control {
  position: absolute;
  margin: 0;
  padding: 0;
  opacity: 0;
  cursor: inherit;
  z-index: 1;
  width: var(--mat-checkbox-state-layer-size, 40px);
  height: var(--mat-checkbox-state-layer-size, 40px);
  top: calc((var(--mat-checkbox-state-layer-size, 40px) - var(--mat-checkbox-state-layer-size, 40px)) / 2);
  right: calc((var(--mat-checkbox-state-layer-size, 40px) - var(--mat-checkbox-state-layer-size, 40px)) / 2);
  left: calc((var(--mat-checkbox-state-layer-size, 40px) - var(--mat-checkbox-state-layer-size, 40px)) / 2);
}

.mdc-checkbox--disabled {
  cursor: default;
  pointer-events: none;
}

.mdc-checkbox__background {
  display: inline-flex;
  position: absolute;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  border: 2px solid currentColor;
  border-radius: 2px;
  background-color: transparent;
  pointer-events: none;
  will-change: background-color, border-color;
  transition: background-color 90ms cubic-bezier(0.4, 0, 0.6, 1), border-color 90ms cubic-bezier(0.4, 0, 0.6, 1);
  -webkit-print-color-adjust: exact;
  color-adjust: exact;
  border-color: var(--mat-checkbox-unselected-icon-color, var(--mat-sys-on-surface-variant));
  top: calc((var(--mat-checkbox-state-layer-size, 40px) - 18px) / 2);
  left: calc((var(--mat-checkbox-state-layer-size, 40px) - 18px) / 2);
}

.mdc-checkbox__native-control:enabled:checked ~ .mdc-checkbox__background,
.mdc-checkbox__native-control:enabled:indeterminate ~ .mdc-checkbox__background {
  border-color: var(--mat-checkbox-selected-icon-color, var(--mat-sys-primary));
  background-color: var(--mat-checkbox-selected-icon-color, var(--mat-sys-primary));
}

.mdc-checkbox--disabled .mdc-checkbox__background {
  border-color: var(--mat-checkbox-disabled-unselected-icon-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
@media (forced-colors: active) {
  .mdc-checkbox--disabled .mdc-checkbox__background {
    border-color: GrayText;
  }
}

.mdc-checkbox__native-control:disabled:checked ~ .mdc-checkbox__background,
.mdc-checkbox__native-control:disabled:indeterminate ~ .mdc-checkbox__background {
  background-color: var(--mat-checkbox-disabled-selected-icon-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
  border-color: transparent;
}
@media (forced-colors: active) {
  .mdc-checkbox__native-control:disabled:checked ~ .mdc-checkbox__background,
  .mdc-checkbox__native-control:disabled:indeterminate ~ .mdc-checkbox__background {
    border-color: GrayText;
  }
}

.mdc-checkbox:hover > .mdc-checkbox__native-control:not(:checked) ~ .mdc-checkbox__background,
.mdc-checkbox:hover > .mdc-checkbox__native-control:not(:indeterminate) ~ .mdc-checkbox__background {
  border-color: var(--mat-checkbox-unselected-hover-icon-color, var(--mat-sys-on-surface));
  background-color: transparent;
}

.mdc-checkbox:hover > .mdc-checkbox__native-control:checked ~ .mdc-checkbox__background,
.mdc-checkbox:hover > .mdc-checkbox__native-control:indeterminate ~ .mdc-checkbox__background {
  border-color: var(--mat-checkbox-selected-hover-icon-color, var(--mat-sys-primary));
  background-color: var(--mat-checkbox-selected-hover-icon-color, var(--mat-sys-primary));
}

.mdc-checkbox__native-control:focus:focus:not(:checked) ~ .mdc-checkbox__background,
.mdc-checkbox__native-control:focus:focus:not(:indeterminate) ~ .mdc-checkbox__background {
  border-color: var(--mat-checkbox-unselected-focus-icon-color, var(--mat-sys-on-surface));
}

.mdc-checkbox__native-control:focus:focus:checked ~ .mdc-checkbox__background,
.mdc-checkbox__native-control:focus:focus:indeterminate ~ .mdc-checkbox__background {
  border-color: var(--mat-checkbox-selected-focus-icon-color, var(--mat-sys-primary));
  background-color: var(--mat-checkbox-selected-focus-icon-color, var(--mat-sys-primary));
}

.mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox:hover > .mdc-checkbox__native-control ~ .mdc-checkbox__background,
.mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox .mdc-checkbox__native-control:focus ~ .mdc-checkbox__background,
.mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox__background {
  border-color: var(--mat-checkbox-disabled-unselected-icon-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
@media (forced-colors: active) {
  .mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox:hover > .mdc-checkbox__native-control ~ .mdc-checkbox__background,
  .mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox .mdc-checkbox__native-control:focus ~ .mdc-checkbox__background,
  .mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox__background {
    border-color: GrayText;
  }
}
.mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox__native-control:checked ~ .mdc-checkbox__background,
.mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox__native-control:indeterminate ~ .mdc-checkbox__background {
  background-color: var(--mat-checkbox-disabled-selected-icon-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
  border-color: transparent;
}

.mdc-checkbox__checkmark {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  opacity: 0;
  transition: opacity 180ms cubic-bezier(0.4, 0, 0.6, 1);
  color: var(--mat-checkbox-selected-checkmark-color, var(--mat-sys-on-primary));
}
@media (forced-colors: active) {
  .mdc-checkbox__checkmark {
    color: CanvasText;
  }
}

.mdc-checkbox--disabled .mdc-checkbox__checkmark, .mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox__checkmark {
  color: var(--mat-checkbox-disabled-selected-checkmark-color, var(--mat-sys-surface));
}
@media (forced-colors: active) {
  .mdc-checkbox--disabled .mdc-checkbox__checkmark, .mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox__checkmark {
    color: GrayText;
  }
}

.mdc-checkbox__checkmark-path {
  transition: stroke-dashoffset 180ms cubic-bezier(0.4, 0, 0.6, 1);
  stroke: currentColor;
  stroke-width: 3.12px;
  stroke-dashoffset: 29.7833385;
  stroke-dasharray: 29.7833385;
}

.mdc-checkbox__mixedmark {
  width: 100%;
  height: 0;
  transform: scaleX(0) rotate(0deg);
  border-width: 1px;
  border-style: solid;
  opacity: 0;
  transition: opacity 90ms cubic-bezier(0.4, 0, 0.6, 1), transform 90ms cubic-bezier(0.4, 0, 0.6, 1);
  border-color: var(--mat-checkbox-selected-checkmark-color, var(--mat-sys-on-primary));
}
@media (forced-colors: active) {
  .mdc-checkbox__mixedmark {
    margin: 0 1px;
  }
}

.mdc-checkbox--disabled .mdc-checkbox__mixedmark, .mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox__mixedmark {
  border-color: var(--mat-checkbox-disabled-selected-checkmark-color, var(--mat-sys-surface));
}
@media (forced-colors: active) {
  .mdc-checkbox--disabled .mdc-checkbox__mixedmark, .mdc-checkbox--disabled.mat-mdc-checkbox-disabled-interactive .mdc-checkbox__mixedmark {
    border-color: GrayText;
  }
}

.mdc-checkbox--anim-unchecked-checked .mdc-checkbox__background,
.mdc-checkbox--anim-unchecked-indeterminate .mdc-checkbox__background,
.mdc-checkbox--anim-checked-unchecked .mdc-checkbox__background,
.mdc-checkbox--anim-indeterminate-unchecked .mdc-checkbox__background {
  animation-duration: 180ms;
  animation-timing-function: linear;
}

.mdc-checkbox--anim-unchecked-checked .mdc-checkbox__checkmark-path {
  animation: mdc-checkbox-unchecked-checked-checkmark-path 180ms linear;
  transition: none;
}

.mdc-checkbox--anim-unchecked-indeterminate .mdc-checkbox__mixedmark {
  animation: mdc-checkbox-unchecked-indeterminate-mixedmark 90ms linear;
  transition: none;
}

.mdc-checkbox--anim-checked-unchecked .mdc-checkbox__checkmark-path {
  animation: mdc-checkbox-checked-unchecked-checkmark-path 90ms linear;
  transition: none;
}

.mdc-checkbox--anim-checked-indeterminate .mdc-checkbox__checkmark {
  animation: mdc-checkbox-checked-indeterminate-checkmark 90ms linear;
  transition: none;
}
.mdc-checkbox--anim-checked-indeterminate .mdc-checkbox__mixedmark {
  animation: mdc-checkbox-checked-indeterminate-mixedmark 90ms linear;
  transition: none;
}

.mdc-checkbox--anim-indeterminate-checked .mdc-checkbox__checkmark {
  animation: mdc-checkbox-indeterminate-checked-checkmark 500ms linear;
  transition: none;
}
.mdc-checkbox--anim-indeterminate-checked .mdc-checkbox__mixedmark {
  animation: mdc-checkbox-indeterminate-checked-mixedmark 500ms linear;
  transition: none;
}

.mdc-checkbox--anim-indeterminate-unchecked .mdc-checkbox__mixedmark {
  animation: mdc-checkbox-indeterminate-unchecked-mixedmark 300ms linear;
  transition: none;
}

.mdc-checkbox__native-control:checked ~ .mdc-checkbox__background,
.mdc-checkbox__native-control:indeterminate ~ .mdc-checkbox__background {
  transition: border-color 90ms cubic-bezier(0, 0, 0.2, 1), background-color 90ms cubic-bezier(0, 0, 0.2, 1);
}
.mdc-checkbox__native-control:checked ~ .mdc-checkbox__background > .mdc-checkbox__checkmark > .mdc-checkbox__checkmark-path,
.mdc-checkbox__native-control:indeterminate ~ .mdc-checkbox__background > .mdc-checkbox__checkmark > .mdc-checkbox__checkmark-path {
  stroke-dashoffset: 0;
}

.mdc-checkbox__native-control:checked ~ .mdc-checkbox__background > .mdc-checkbox__checkmark {
  transition: opacity 180ms cubic-bezier(0, 0, 0.2, 1), transform 180ms cubic-bezier(0, 0, 0.2, 1);
  opacity: 1;
}
.mdc-checkbox__native-control:checked ~ .mdc-checkbox__background > .mdc-checkbox__mixedmark {
  transform: scaleX(1) rotate(-45deg);
}

.mdc-checkbox__native-control:indeterminate ~ .mdc-checkbox__background > .mdc-checkbox__checkmark {
  transform: rotate(45deg);
  opacity: 0;
  transition: opacity 90ms cubic-bezier(0.4, 0, 0.6, 1), transform 90ms cubic-bezier(0.4, 0, 0.6, 1);
}
.mdc-checkbox__native-control:indeterminate ~ .mdc-checkbox__background > .mdc-checkbox__mixedmark {
  transform: scaleX(1) rotate(0deg);
  opacity: 1;
}

@keyframes mdc-checkbox-unchecked-checked-checkmark-path {
  0%, 50% {
    stroke-dashoffset: 29.7833385;
  }
  50% {
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  100% {
    stroke-dashoffset: 0;
  }
}
@keyframes mdc-checkbox-unchecked-indeterminate-mixedmark {
  0%, 68.2% {
    transform: scaleX(0);
  }
  68.2% {
    animation-timing-function: cubic-bezier(0, 0, 0, 1);
  }
  100% {
    transform: scaleX(1);
  }
}
@keyframes mdc-checkbox-checked-unchecked-checkmark-path {
  from {
    animation-timing-function: cubic-bezier(0.4, 0, 1, 1);
    opacity: 1;
    stroke-dashoffset: 0;
  }
  to {
    opacity: 0;
    stroke-dashoffset: -29.7833385;
  }
}
@keyframes mdc-checkbox-checked-indeterminate-checkmark {
  from {
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    transform: rotate(0deg);
    opacity: 1;
  }
  to {
    transform: rotate(45deg);
    opacity: 0;
  }
}
@keyframes mdc-checkbox-indeterminate-checked-checkmark {
  from {
    animation-timing-function: cubic-bezier(0.14, 0, 0, 1);
    transform: rotate(45deg);
    opacity: 0;
  }
  to {
    transform: rotate(360deg);
    opacity: 1;
  }
}
@keyframes mdc-checkbox-checked-indeterminate-mixedmark {
  from {
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    transform: rotate(-45deg);
    opacity: 0;
  }
  to {
    transform: rotate(0deg);
    opacity: 1;
  }
}
@keyframes mdc-checkbox-indeterminate-checked-mixedmark {
  from {
    animation-timing-function: cubic-bezier(0.14, 0, 0, 1);
    transform: rotate(0deg);
    opacity: 1;
  }
  to {
    transform: rotate(315deg);
    opacity: 0;
  }
}
@keyframes mdc-checkbox-indeterminate-unchecked-mixedmark {
  0% {
    animation-timing-function: linear;
    transform: scaleX(1);
    opacity: 1;
  }
  32.8%, 100% {
    transform: scaleX(0);
    opacity: 0;
  }
}
.mat-mdc-checkbox {
  display: inline-block;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}
.mat-mdc-checkbox._mat-animation-noopable > .mat-internal-form-field > .mdc-checkbox > .mat-mdc-checkbox-touch-target,
.mat-mdc-checkbox._mat-animation-noopable > .mat-internal-form-field > .mdc-checkbox > .mdc-checkbox__native-control,
.mat-mdc-checkbox._mat-animation-noopable > .mat-internal-form-field > .mdc-checkbox > .mdc-checkbox__ripple,
.mat-mdc-checkbox._mat-animation-noopable > .mat-internal-form-field > .mdc-checkbox > .mat-mdc-checkbox-ripple::before,
.mat-mdc-checkbox._mat-animation-noopable > .mat-internal-form-field > .mdc-checkbox > .mdc-checkbox__background,
.mat-mdc-checkbox._mat-animation-noopable > .mat-internal-form-field > .mdc-checkbox > .mdc-checkbox__background > .mdc-checkbox__checkmark,
.mat-mdc-checkbox._mat-animation-noopable > .mat-internal-form-field > .mdc-checkbox > .mdc-checkbox__background > .mdc-checkbox__checkmark > .mdc-checkbox__checkmark-path,
.mat-mdc-checkbox._mat-animation-noopable > .mat-internal-form-field > .mdc-checkbox > .mdc-checkbox__background > .mdc-checkbox__mixedmark {
  transition: none !important;
  animation: none !important;
}
.mat-mdc-checkbox label {
  cursor: pointer;
}
.mat-mdc-checkbox .mat-internal-form-field {
  color: var(--mat-checkbox-label-text-color, var(--mat-sys-on-surface));
  font-family: var(--mat-checkbox-label-text-font, var(--mat-sys-body-medium-font));
  line-height: var(--mat-checkbox-label-text-line-height, var(--mat-sys-body-medium-line-height));
  font-size: var(--mat-checkbox-label-text-size, var(--mat-sys-body-medium-size));
  letter-spacing: var(--mat-checkbox-label-text-tracking, var(--mat-sys-body-medium-tracking));
  font-weight: var(--mat-checkbox-label-text-weight, var(--mat-sys-body-medium-weight));
}
.mat-mdc-checkbox.mat-mdc-checkbox-disabled.mat-mdc-checkbox-disabled-interactive {
  pointer-events: auto;
}
.mat-mdc-checkbox.mat-mdc-checkbox-disabled.mat-mdc-checkbox-disabled-interactive input {
  cursor: default;
}
.mat-mdc-checkbox.mat-mdc-checkbox-disabled label {
  cursor: default;
  color: var(--mat-checkbox-disabled-label-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
@media (forced-colors: active) {
  .mat-mdc-checkbox.mat-mdc-checkbox-disabled label {
    color: GrayText;
  }
}
.mat-mdc-checkbox label:empty {
  display: none;
}
.mat-mdc-checkbox .mdc-checkbox__ripple {
  opacity: 0;
}

.mat-mdc-checkbox .mat-mdc-checkbox-ripple,
.mdc-checkbox__ripple {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.mat-mdc-checkbox .mat-mdc-checkbox-ripple:not(:empty),
.mdc-checkbox__ripple:not(:empty) {
  transform: translateZ(0);
}

.mat-mdc-checkbox-ripple .mat-ripple-element {
  opacity: 0.1;
}

.mat-mdc-checkbox-touch-target {
  position: absolute;
  top: 50%;
  left: 50%;
  height: var(--mat-checkbox-touch-target-size, 48px);
  width: var(--mat-checkbox-touch-target-size, 48px);
  transform: translate(-50%, -50%);
  display: var(--mat-checkbox-touch-target-display, block);
}

.mat-mdc-checkbox .mat-mdc-checkbox-ripple::before {
  border-radius: 50%;
}

.mdc-checkbox__native-control:focus-visible ~ .mat-focus-indicator::before {
  content: "";
}
`],encapsulation:2,changeDetection:0})}return n})(),je=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=we({type:n});static \u0275inj=ke({imports:[Ae,Fe]})}return n})();function vc(n,s){n&1&&(o(0,"mat-option",19),l(1,"Toggle"),a(),o(2,"mat-option",20),l(3,"Push"),a(),o(4,"mat-option",21),l(5,"Indicator"),a())}function Cc(n,s){n&1&&(o(0,"mat-option",8),l(1,"Zone State"),a())}function yc(n,s){if(n&1&&(o(0,"mat-option",10),l(1),a()),n&2){let e=s.$implicit;g("value",It(e.value)),d(),v(e.label)}}function xc(n,s){n&1&&(o(0,"mat-checkbox",12),l(1," Use numeric path "),a())}function kc(n,s){if(n&1){let e=P();o(0,"button",22),C("click",function(){y(e);let i=u();return x(i.moveCtrlUp())}),o(1,"mat-icon"),l(2,"arrow_drop_up"),a()()}}function wc(n,s){if(n&1){let e=P();o(0,"button",23),C("click",function(){y(e);let i=u();return x(i.moveCtrlDown())}),o(1,"mat-icon"),l(2,"arrow_drop_down"),a()()}}var Ur=(()=>{class n{app=m(xi);ctrlFormGroup=S.required();controlIndex=S.required();arrayLength=S.required();deleteCtrl=bt();moveUp=bt();moveDown=bt();colors=[];ngOnInit(){this.colors=this.app.configurableThemeColors}deleteControl(){let e={ctrlIndex:this.controlIndex(),pathID:this.ctrlFormGroup().controls.pathID.value??""};this.deleteCtrl.emit(e)}moveCtrlUp(){this.moveUp.emit(this.controlIndex())}moveCtrlDown(){this.moveDown.emit(this.controlIndex())}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["boolean-control-config"]],inputs:{ctrlFormGroup:[1,"ctrlFormGroup"],controlIndex:[1,"controlIndex"],arrayLength:[1,"arrayLength"]},outputs:{deleteCtrl:"deleteCtrl",moveUp:"moveUp",moveDown:"moveDown"},decls:31,vars:5,consts:[[1,"ctrl-grid","rounded-card","rounded-card-color",3,"formGroup"],[1,"controls","flex-container"],[1,"flex-label"],[1,"full-width"],["matInput","","type","string","placeholder","Enter a display label...","formControlName","ctrlLabel"],[1,"flex-settings"],[1,"settings"],["placeholder","Select Type...","formControlName","type","name","type","required",""],["value","4"],["placeholder","Select Color...","formControlName","color","name","color","required",""],[3,"value"],[1,"flex-full-width"],["formControlName","isNumeric"],[1,"actions"],[1,"flex-actions"],[1,"btn-grid"],["mat-icon-button","","type","button","aria-label","Move control up in the list",1,"up"],["mat-icon-button","","type","button","aria-label","Move control down in the list",1,"down"],["mat-icon-button","","type","button","aria-label","Delete control",1,"delete",3,"click"],["value","1"],["value","2"],["value","3"],["mat-icon-button","","type","button","aria-label","Move control up in the list",1,"up",3,"click"],["mat-icon-button","","type","button","aria-label","Move control down in the list",1,"down",3,"click"]],template:function(t,i){t&1&&(o(0,"div",0)(1,"div",1)(2,"div",2)(3,"mat-form-field",3)(4,"mat-label"),l(5,"Label"),a(),b(6,"input",4),a()(),o(7,"div",5)(8,"mat-form-field",6)(9,"mat-label"),l(10,"Type"),a(),o(11,"mat-select",7),h(12,vc,6,0)(13,Cc,2,0,"mat-option",8),a()()(),o(14,"div",5)(15,"mat-form-field",6)(16,"mat-label"),l(17,"Color"),a(),o(18,"mat-select",9),I(19,yc,2,3,"mat-option",10,oe),a()()(),o(21,"div",11),h(22,xc,2,0,"mat-checkbox",12),a()(),o(23,"div",13)(24,"div",14)(25,"div",15),h(26,kc,3,0,"button",16),h(27,wc,3,0,"button",17),o(28,"button",18),C("click",function(){return i.deleteControl()}),o(29,"mat-icon"),l(30,"delete"),a()()()()()()),t&2&&(g("formGroup",i.ctrlFormGroup()),d(12),f(i.ctrlFormGroup().value.type!=="4"?12:13),d(7),A(i.colors),d(3),f(i.ctrlFormGroup().value.type!=="4"?22:-1),d(4),f(i.controlIndex()!==0?26:-1),d(),f(i.controlIndex()!==i.arrayLength()-1?27:-1))},dependencies:[$e,fe,Q,ce,Me,J,U,Re,te,Z,ge,Ee,ee,le,je,Ae,de,K],styles:['.ctrl-grid[_ngcontent-%COMP%]{display:grid;width:auto;height:auto;margin:0 0 10px;grid-template-columns:[col-start] calc(100% - 90px) [col1-end] 80px [col2-end];grid-template-areas:"controls actions";row-gap:0px;column-gap:10px;justify-items:center;align-items:center;justify-content:center;align-content:center;padding-top:20px}.controls[_ngcontent-%COMP%]{grid-area:controls;width:100%}.actions[_ngcontent-%COMP%]{grid-area:actions}.btn-grid[_ngcontent-%COMP%]{display:grid;width:80px;height:80px;margin:0;grid-template-columns:[col-start] 50% [col1-end] 50% [col2-end];grid-template-rows:[row-start] 50% [row1-end] 50% [row2-end];grid-template-areas:"up delete" "down delete";row-gap:0px;column-gap:0px;justify-items:center;align-items:center;justify-content:center;align-content:center}.up[_ngcontent-%COMP%]{grid-area:up}.down[_ngcontent-%COMP%]{grid-area:down}.delete[_ngcontent-%COMP%]{grid-area:delete}.flex-label[_ngcontent-%COMP%]{flex-grow:2;flex-shrink:2}.flex-settings[_ngcontent-%COMP%]{flex-grow:1;flex-shrink:1}.settings[_ngcontent-%COMP%]{min-width:100px}.flex-actions[_ngcontent-%COMP%]{flex-grow:0;flex-shrink:0}.flex-full-width[_ngcontent-%COMP%]{width:100%}']})}return n})();function Sc(n,s){if(n&1){let e=P();o(0,"boolean-control-config",4),C("moveUp",function(i){y(e);let r=u(2);return x(r.moveUp(i))})("moveDown",function(i){y(e);let r=u(2);return x(r.moveDown(i))})("deleteCtrl",function(i){y(e);let r=u(2);return x(r.deletePath(i))}),a()}if(n&2){let e=s.$implicit,t=s.$index,i=u(2);g("ctrlFormGroup",i.getFormGroup(e))("controlIndex",t)("arrayLength",i.arrayLength)}}function Mc(n,s){if(n&1){let e=P();o(0,"div",0)(1,"div",1),I(2,Sc,1,3,"boolean-control-config",2,_e),o(4,"button",3),C("click",function(){y(e);let i=u();return x(i.addCtrlGroup())}),o(5,"mat-icon"),l(6,"add"),a()()()()}if(n&2){let e=u();g("formGroup",s),d(2),A(e.multiCtrlArray().controls)}}var Wr=(()=>{class n{fb=m(Yt);multiCtrlArray=S.required();zonesOnlyPaths=S.required();addPath=bt();updatePath=bt();delPath=bt();multiFormGroup=null;arrayLength=0;multiCtrlArraySubscription=null;ngOnInit(){this.arrayLength=this.multiCtrlArray().length,this.multiFormGroup=new Oo({multiCtrlArray:this.multiCtrlArray()}),this.multiCtrlArraySubscription=this.multiCtrlArray().valueChanges.pipe(Lt(350)).subscribe(e=>{this.updatePath.emit(e)})}addCtrlGroup(){let e=oo.create();this.multiCtrlArray().push(this.fb.group({ctrlLabel:[null,z.required],type:[this.zonesOnlyPaths()?"4":"1",z.required],pathID:[e],color:["contrast"],isNumeric:[!!this.zonesOnlyPaths()],value:[null]})),this.arrayLength=this.multiCtrlArray().length;let t={path:{description:null,path:null,pathID:e,source:"default",pathType:this.zonesOnlyPaths()?"number":"boolean",zonesOnlyPaths:this.zonesOnlyPaths(),supportsPut:!this.zonesOnlyPaths(),isPathConfigurable:!0,showPathSkUnitsFilter:!1,pathSkUnitsFilter:null,convertUnitTo:null},ctrlType:this.zonesOnlyPaths()?4:3};this.addPath.emit(t)}moveUp(e){let t=this.multiCtrlArray().at(e);this.multiCtrlArray().removeAt(e,{emitEvent:!1}),this.multiCtrlArray().insert(e-1,t,{emitEvent:!1})}moveDown(e){let t=this.multiCtrlArray().at(e);this.multiCtrlArray().removeAt(e,{emitEvent:!1}),this.multiCtrlArray().insert(e+1,t,{emitEvent:!1})}deletePath(e){this.delPath.emit(e),this.arrayLength=this.multiCtrlArray().length}getFormGroup(e){return e}ngOnDestroy(){this.multiCtrlArraySubscription?.unsubscribe()}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["boolean-multicontrol-options"]],inputs:{multiCtrlArray:[1,"multiCtrlArray"],zonesOnlyPaths:[1,"zonesOnlyPaths"]},outputs:{addPath:"addPath",updatePath:"updatePath",delPath:"delPath"},decls:1,vars:1,consts:[[3,"formGroup"],["formArrayName","multiCtrlArray"],[1,"full-width",3,"ctrlFormGroup","controlIndex","arrayLength"],["type","button","mat-mini-fab","","color","primary","aria-label","Add control down in the list",1,"add-btn",3,"click"],[1,"full-width",3,"moveUp","moveDown","deleteCtrl","ctrlFormGroup","controlIndex","arrayLength"]],template:function(t,i){if(t&1&&h(0,Mc,7,1,"div",0),t&2){let r;f((r=i.multiFormGroup)?0:-1,r)}},dependencies:[$e,ce,J,U,vi,Ur,se,To,de,K],styles:["[_nghost-%COMP%]{display:block;width:100%;height:100%;padding-top:15px;padding-bottom:15px}.add-btn[_ngcontent-%COMP%]{margin-left:calc(50% - 20px)}"]})}return n})();var Tc=["input"],Ec=["formField"],Ic=["*"],Ln=class{source;value;constructor(s,e){this.source=s,this.value=e}},Ac={provide:Ht,useExisting:Vt(()=>Ca),multi:!0},$r=new H("MatRadioGroup"),Dc=new H("mat-radio-default-options",{providedIn:"root",factory:()=>({color:"accent",disabledInteractive:!1})}),Ca=(()=>{class n{_changeDetector=m(Oe);_value=null;_name=m(ye).getId("mat-radio-group-");_selected=null;_isInitialized=!1;_labelPosition="after";_disabled=!1;_required=!1;_buttonChanges;_controlValueAccessorChangeFn=()=>{};onTouched=()=>{};change=new j;_radios;color;get name(){return this._name}set name(e){this._name=e,this._updateRadioButtonNames()}get labelPosition(){return this._labelPosition}set labelPosition(e){this._labelPosition=e==="before"?"before":"after",this._markRadiosForCheck()}get value(){return this._value}set value(e){this._value!==e&&(this._value=e,this._updateSelectedRadioFromValue(),this._checkSelectedRadioButton())}_checkSelectedRadioButton(){this._selected&&!this._selected.checked&&(this._selected.checked=!0)}get selected(){return this._selected}set selected(e){this._selected=e,this.value=e?e.value:null,this._checkSelectedRadioButton()}get disabled(){return this._disabled}set disabled(e){this._disabled=e,this._markRadiosForCheck()}get required(){return this._required}set required(e){this._required=e,this._markRadiosForCheck()}get disabledInteractive(){return this._disabledInteractive}set disabledInteractive(e){this._disabledInteractive=e,this._markRadiosForCheck()}_disabledInteractive=!1;constructor(){}ngAfterContentInit(){this._isInitialized=!0,this._buttonChanges=this._radios.changes.subscribe(()=>{this.selected&&!this._radios.find(e=>e===this.selected)&&(this._selected=null)})}ngOnDestroy(){this._buttonChanges?.unsubscribe()}_touch(){this.onTouched&&this.onTouched()}_updateRadioButtonNames(){this._radios&&this._radios.forEach(e=>{e.name=this.name,e._markForCheck()})}_updateSelectedRadioFromValue(){let e=this._selected!==null&&this._selected.value===this._value;this._radios&&!e&&(this._selected=null,this._radios.forEach(t=>{t.checked=this.value===t.value,t.checked&&(this._selected=t)}))}_emitChangeEvent(){this._isInitialized&&this.change.emit(new Ln(this._selected,this._value))}_markRadiosForCheck(){this._radios&&this._radios.forEach(e=>e._markForCheck())}writeValue(e){this.value=e,this._changeDetector.markForCheck()}registerOnChange(e){this._controlValueAccessorChangeFn=e}registerOnTouched(e){this.onTouched=e}setDisabledState(e){this.disabled=e,this._changeDetector.markForCheck()}static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,selectors:[["mat-radio-group"]],contentQueries:function(t,i,r){if(t&1&&lt(r,Vn,5),t&2){let c;O(c=F())&&(i._radios=c)}},hostAttrs:["role","radiogroup",1,"mat-mdc-radio-group"],inputs:{color:"color",name:"name",labelPosition:"labelPosition",value:"value",selected:"selected",disabled:[2,"disabled","disabled",D],required:[2,"required","required",D],disabledInteractive:[2,"disabledInteractive","disabledInteractive",D]},outputs:{change:"change"},exportAs:["matRadioGroup"],features:[ve([Ac,{provide:$r,useExisting:n}])]})}return n})(),Vn=(()=>{class n{_elementRef=m(X);_changeDetector=m(Oe);_focusMonitor=m(Vi);_radioDispatcher=m(No);_defaultOptions=m(Dc,{optional:!0});_ngZone=m(ae);_renderer=m(Be);_uniqueId=m(ye).getId("mat-radio-");_cleanupClick;id=this._uniqueId;name;ariaLabel;ariaLabelledby;ariaDescribedby;disableRipple=!1;tabIndex=0;get checked(){return this._checked}set checked(e){this._checked!==e&&(this._checked=e,e&&this.radioGroup&&this.radioGroup.value!==this.value?this.radioGroup.selected=this:!e&&this.radioGroup&&this.radioGroup.value===this.value&&(this.radioGroup.selected=null),e&&this._radioDispatcher.notify(this.id,this.name),this._changeDetector.markForCheck())}get value(){return this._value}set value(e){this._value!==e&&(this._value=e,this.radioGroup!==null&&(this.checked||(this.checked=this.radioGroup.value===e),this.checked&&(this.radioGroup.selected=this)))}get labelPosition(){return this._labelPosition||this.radioGroup&&this.radioGroup.labelPosition||"after"}set labelPosition(e){this._labelPosition=e}_labelPosition;get disabled(){return this._disabled||this.radioGroup!==null&&this.radioGroup.disabled}set disabled(e){this._setDisabled(e)}get required(){return this._required||this.radioGroup&&this.radioGroup.required}set required(e){e!==this._required&&this._changeDetector.markForCheck(),this._required=e}get color(){return this._color||this.radioGroup&&this.radioGroup.color||this._defaultOptions&&this._defaultOptions.color||"accent"}set color(e){this._color=e}_color;get disabledInteractive(){return this._disabledInteractive||this.radioGroup!==null&&this.radioGroup.disabledInteractive}set disabledInteractive(e){this._disabledInteractive=e}_disabledInteractive;change=new j;radioGroup;get inputId(){return`${this.id||this._uniqueId}-input`}_checked=!1;_disabled=!1;_required=!1;_value=null;_removeUniqueSelectionListener=()=>{};_previousTabIndex;_inputElement;_rippleTrigger;_noopAnimations=Ie();_injector=m(_t);constructor(){m(st).load($t);let e=m($r,{optional:!0}),t=m(new At("tabindex"),{optional:!0});this.radioGroup=e,this._disabledInteractive=this._defaultOptions?.disabledInteractive??!1,t&&(this.tabIndex=Ze(t,0))}focus(e,t){t?this._focusMonitor.focusVia(this._inputElement,t,e):this._inputElement.nativeElement.focus(e)}_markForCheck(){this._changeDetector.markForCheck()}ngOnInit(){this.radioGroup&&(this.checked=this.radioGroup.value===this._value,this.checked&&(this.radioGroup.selected=this),this.name=this.radioGroup.name),this._removeUniqueSelectionListener=this._radioDispatcher.listen((e,t)=>{e!==this.id&&t===this.name&&(this.checked=!1)})}ngDoCheck(){this._updateTabIndex()}ngAfterViewInit(){this._updateTabIndex(),this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{!e&&this.radioGroup&&this.radioGroup._touch()}),this._ngZone.runOutsideAngular(()=>{this._cleanupClick=this._renderer.listen(this._inputElement.nativeElement,"click",this._onInputClick)})}ngOnDestroy(){this._cleanupClick?.(),this._focusMonitor.stopMonitoring(this._elementRef),this._removeUniqueSelectionListener()}_emitChangeEvent(){this.change.emit(new Ln(this,this._value))}_isRippleDisabled(){return this.disableRipple||this.disabled}_onInputInteraction(e){if(e.stopPropagation(),!this.checked&&!this.disabled){let t=this.radioGroup&&this.value!==this.radioGroup.value;this.checked=!0,this._emitChangeEvent(),this.radioGroup&&(this.radioGroup._controlValueAccessorChangeFn(this.value),t&&this.radioGroup._emitChangeEvent())}}_onTouchTargetClick(e){this._onInputInteraction(e),(!this.disabled||this.disabledInteractive)&&this._inputElement?.nativeElement.focus()}_setDisabled(e){this._disabled!==e&&(this._disabled=e,this._changeDetector.markForCheck())}_onInputClick=e=>{this.disabled&&this.disabledInteractive&&e.preventDefault()};_updateTabIndex(){let e=this.radioGroup,t;if(!e||!e.selected||this.disabled?t=this.tabIndex:t=e.selected===this?this.tabIndex:-1,t!==this._previousTabIndex){let i=this._inputElement?.nativeElement;i&&(i.setAttribute("tabindex",t+""),this._previousTabIndex=t,Bt(()=>{queueMicrotask(()=>{e&&e.selected&&e.selected!==this&&document.activeElement===i&&(e.selected?._inputElement.nativeElement.focus(),document.activeElement===i&&this._inputElement.nativeElement.blur())})},{injector:this._injector}))}}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["mat-radio-button"]],viewQuery:function(t,i){if(t&1&&Pe(Tc,5)(Ec,7,X),t&2){let r;O(r=F())&&(i._inputElement=r.first),O(r=F())&&(i._rippleTrigger=r.first)}},hostAttrs:[1,"mat-mdc-radio-button"],hostVars:19,hostBindings:function(t,i){t&1&&C("focus",function(){return i._inputElement.nativeElement.focus()}),t&2&&($("id",i.id)("tabindex",null)("aria-label",null)("aria-labelledby",null)("aria-describedby",null),G("mat-primary",i.color==="primary")("mat-accent",i.color==="accent")("mat-warn",i.color==="warn")("mat-mdc-radio-checked",i.checked)("mat-mdc-radio-disabled",i.disabled)("mat-mdc-radio-disabled-interactive",i.disabledInteractive)("_mat-animation-noopable",i._noopAnimations))},inputs:{id:"id",name:"name",ariaLabel:[0,"aria-label","ariaLabel"],ariaLabelledby:[0,"aria-labelledby","ariaLabelledby"],ariaDescribedby:[0,"aria-describedby","ariaDescribedby"],disableRipple:[2,"disableRipple","disableRipple",D],tabIndex:[2,"tabIndex","tabIndex",e=>e==null?0:Ze(e)],checked:[2,"checked","checked",D],value:"value",labelPosition:"labelPosition",disabled:[2,"disabled","disabled",D],required:[2,"required","required",D],color:"color",disabledInteractive:[2,"disabledInteractive","disabledInteractive",D]},outputs:{change:"change"},exportAs:["matRadioButton"],ngContentSelectors:Ic,decls:13,vars:17,consts:[["formField",""],["input",""],["mat-internal-form-field","",3,"labelPosition"],[1,"mdc-radio"],["aria-hidden","true",1,"mat-mdc-radio-touch-target",3,"click"],["type","radio","aria-invalid","false",1,"mdc-radio__native-control",3,"change","id","checked","disabled","required"],["aria-hidden","true",1,"mdc-radio__background"],[1,"mdc-radio__outer-circle"],[1,"mdc-radio__inner-circle"],["mat-ripple","","aria-hidden","true",1,"mat-radio-ripple","mat-focus-indicator",3,"matRippleTrigger","matRippleDisabled","matRippleCentered"],[1,"mat-ripple-element","mat-radio-persistent-ripple"],[1,"mdc-label",3,"for"]],template:function(t,i){t&1&&(Ne(),o(0,"div",2,0)(2,"div",3)(3,"div",4),C("click",function(c){return i._onTouchTargetClick(c)}),a(),o(4,"input",5,1),C("change",function(c){return i._onInputInteraction(c)}),a(),o(6,"div",6),b(7,"div",7)(8,"div",8),a(),o(9,"div",9),b(10,"div",10),a()(),o(11,"label",11),re(12),a()()),t&2&&(g("labelPosition",i.labelPosition),d(2),G("mdc-radio--disabled",i.disabled),d(2),g("id",i.inputId)("checked",i.checked)("disabled",i.disabled&&!i.disabledInteractive)("required",i.required),$("name",i.name)("value",i.value)("aria-label",i.ariaLabel)("aria-labelledby",i.ariaLabelledby)("aria-describedby",i.ariaDescribedby)("aria-disabled",i.disabled&&i.disabledInteractive?"true":null),d(5),g("matRippleTrigger",i._rippleTrigger.nativeElement)("matRippleDisabled",i._isRippleDisabled())("matRippleCentered",!0),d(2),g("for",i.inputId))},dependencies:[Pt,yi],styles:[`.mat-mdc-radio-button {
  -webkit-tap-highlight-color: transparent;
}
.mat-mdc-radio-button .mdc-radio {
  display: inline-block;
  position: relative;
  flex: 0 0 auto;
  box-sizing: content-box;
  width: 20px;
  height: 20px;
  cursor: pointer;
  will-change: opacity, transform, border-color, color;
  padding: calc((var(--mat-radio-state-layer-size, 40px) - 20px) / 2);
}
.mat-mdc-radio-button .mdc-radio:hover > .mdc-radio__native-control:not([disabled]):not(:focus) ~ .mdc-radio__background::before {
  opacity: 0.04;
  transform: scale(1);
}
.mat-mdc-radio-button .mdc-radio:hover > .mdc-radio__native-control:not([disabled]) ~ .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-unselected-hover-icon-color, var(--mat-sys-on-surface));
}
.mat-mdc-radio-button .mdc-radio:hover > .mdc-radio__native-control:enabled:checked + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-selected-hover-icon-color, var(--mat-sys-primary));
}
.mat-mdc-radio-button .mdc-radio:hover > .mdc-radio__native-control:enabled:checked + .mdc-radio__background > .mdc-radio__inner-circle {
  background-color: var(--mat-radio-selected-hover-icon-color, var(--mat-sys-primary, currentColor));
}
.mat-mdc-radio-button .mdc-radio:active > .mdc-radio__native-control:enabled:not(:checked) + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-unselected-pressed-icon-color, var(--mat-sys-on-surface));
}
.mat-mdc-radio-button .mdc-radio:active > .mdc-radio__native-control:enabled:checked + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-selected-pressed-icon-color, var(--mat-sys-primary));
}
.mat-mdc-radio-button .mdc-radio:active > .mdc-radio__native-control:enabled:checked + .mdc-radio__background > .mdc-radio__inner-circle {
  background-color: var(--mat-radio-selected-pressed-icon-color, var(--mat-sys-primary, currentColor));
}
.mat-mdc-radio-button .mdc-radio__background {
  display: inline-block;
  position: relative;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
}
.mat-mdc-radio-button .mdc-radio__background::before {
  position: absolute;
  transform: scale(0, 0);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  content: "";
  transition: opacity 90ms cubic-bezier(0.4, 0, 0.6, 1), transform 90ms cubic-bezier(0.4, 0, 0.6, 1);
  width: var(--mat-radio-state-layer-size, 40px);
  height: var(--mat-radio-state-layer-size, 40px);
  top: calc(-1 * (var(--mat-radio-state-layer-size, 40px) - 20px) / 2);
  left: calc(-1 * (var(--mat-radio-state-layer-size, 40px) - 20px) / 2);
}
.mat-mdc-radio-button .mdc-radio__outer-circle {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border-width: 2px;
  border-style: solid;
  border-radius: 50%;
  transition: border-color 90ms cubic-bezier(0.4, 0, 0.6, 1);
}
.mat-mdc-radio-button .mdc-radio__inner-circle {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  transform: scale(0);
  border-radius: 50%;
  transition: transform 90ms cubic-bezier(0.4, 0, 0.6, 1), background-color 90ms cubic-bezier(0.4, 0, 0.6, 1);
}
@media (forced-colors: active) {
  .mat-mdc-radio-button .mdc-radio__inner-circle {
    background-color: CanvasText !important;
  }
}
.mat-mdc-radio-button .mdc-radio__native-control {
  position: absolute;
  margin: 0;
  padding: 0;
  opacity: 0;
  top: 0;
  right: 0;
  left: 0;
  cursor: inherit;
  z-index: 1;
  width: var(--mat-radio-state-layer-size, 40px);
  height: var(--mat-radio-state-layer-size, 40px);
}
.mat-mdc-radio-button .mdc-radio__native-control:checked + .mdc-radio__background, .mat-mdc-radio-button .mdc-radio__native-control:disabled + .mdc-radio__background {
  transition: opacity 90ms cubic-bezier(0, 0, 0.2, 1), transform 90ms cubic-bezier(0, 0, 0.2, 1);
}
.mat-mdc-radio-button .mdc-radio__native-control:checked + .mdc-radio__background > .mdc-radio__outer-circle, .mat-mdc-radio-button .mdc-radio__native-control:disabled + .mdc-radio__background > .mdc-radio__outer-circle {
  transition: border-color 90ms cubic-bezier(0, 0, 0.2, 1);
}
.mat-mdc-radio-button .mdc-radio__native-control:checked + .mdc-radio__background > .mdc-radio__inner-circle, .mat-mdc-radio-button .mdc-radio__native-control:disabled + .mdc-radio__background > .mdc-radio__inner-circle {
  transition: transform 90ms cubic-bezier(0, 0, 0.2, 1), background-color 90ms cubic-bezier(0, 0, 0.2, 1);
}
.mat-mdc-radio-button .mdc-radio__native-control:focus + .mdc-radio__background::before {
  transform: scale(1);
  opacity: 0.12;
  transition: opacity 90ms cubic-bezier(0, 0, 0.2, 1), transform 90ms cubic-bezier(0, 0, 0.2, 1);
}
.mat-mdc-radio-button .mdc-radio__native-control:disabled:not(:checked) + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-disabled-unselected-icon-color, var(--mat-sys-on-surface));
  opacity: var(--mat-radio-disabled-unselected-icon-opacity, 0.38);
}
.mat-mdc-radio-button .mdc-radio__native-control:disabled + .mdc-radio__background {
  cursor: default;
}
.mat-mdc-radio-button .mdc-radio__native-control:disabled + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-disabled-selected-icon-color, var(--mat-sys-on-surface));
  opacity: var(--mat-radio-disabled-selected-icon-opacity, 0.38);
}
.mat-mdc-radio-button .mdc-radio__native-control:disabled + .mdc-radio__background > .mdc-radio__inner-circle {
  background-color: var(--mat-radio-disabled-selected-icon-color, var(--mat-sys-on-surface, currentColor));
  opacity: var(--mat-radio-disabled-selected-icon-opacity, 0.38);
}
.mat-mdc-radio-button .mdc-radio__native-control:enabled:not(:checked) + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-unselected-icon-color, var(--mat-sys-on-surface-variant));
}
.mat-mdc-radio-button .mdc-radio__native-control:enabled:checked + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-selected-icon-color, var(--mat-sys-primary));
}
.mat-mdc-radio-button .mdc-radio__native-control:enabled:checked + .mdc-radio__background > .mdc-radio__inner-circle {
  background-color: var(--mat-radio-selected-icon-color, var(--mat-sys-primary, currentColor));
}
.mat-mdc-radio-button .mdc-radio__native-control:enabled:focus:checked + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-selected-focus-icon-color, var(--mat-sys-primary));
}
.mat-mdc-radio-button .mdc-radio__native-control:enabled:focus:checked + .mdc-radio__background > .mdc-radio__inner-circle {
  background-color: var(--mat-radio-selected-focus-icon-color, var(--mat-sys-primary, currentColor));
}
.mat-mdc-radio-button .mdc-radio__native-control:checked + .mdc-radio__background > .mdc-radio__inner-circle {
  transform: scale(0.5);
  transition: transform 90ms cubic-bezier(0, 0, 0.2, 1), background-color 90ms cubic-bezier(0, 0, 0.2, 1);
}
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled {
  pointer-events: auto;
}
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mdc-radio__native-control:not(:checked) + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-disabled-unselected-icon-color, var(--mat-sys-on-surface));
  opacity: var(--mat-radio-disabled-unselected-icon-opacity, 0.38);
}
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled:hover .mdc-radio__native-control:checked + .mdc-radio__background > .mdc-radio__outer-circle,
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mdc-radio__native-control:checked:focus + .mdc-radio__background > .mdc-radio__outer-circle,
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mdc-radio__native-control + .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-disabled-selected-icon-color, var(--mat-sys-on-surface));
  opacity: var(--mat-radio-disabled-selected-icon-opacity, 0.38);
}
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled:hover .mdc-radio__native-control:checked + .mdc-radio__background > .mdc-radio__inner-circle,
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mdc-radio__native-control:checked:focus + .mdc-radio__background > .mdc-radio__inner-circle,
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mdc-radio__native-control + .mdc-radio__background > .mdc-radio__inner-circle {
  background-color: var(--mat-radio-disabled-selected-icon-color, var(--mat-sys-on-surface, currentColor));
  opacity: var(--mat-radio-disabled-selected-icon-opacity, 0.38);
}
.mat-mdc-radio-button._mat-animation-noopable .mdc-radio__background::before,
.mat-mdc-radio-button._mat-animation-noopable .mdc-radio__outer-circle,
.mat-mdc-radio-button._mat-animation-noopable .mdc-radio__inner-circle {
  transition: none !important;
}
.mat-mdc-radio-button label {
  cursor: pointer;
}
.mat-mdc-radio-button label:empty {
  display: none;
}
.mat-mdc-radio-button .mdc-radio__background::before {
  background-color: var(--mat-radio-ripple-color, var(--mat-sys-on-surface));
}
.mat-mdc-radio-button.mat-mdc-radio-checked .mat-ripple-element,
.mat-mdc-radio-button.mat-mdc-radio-checked .mdc-radio__background::before {
  background-color: var(--mat-radio-checked-ripple-color, var(--mat-sys-primary));
}
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mat-ripple-element,
.mat-mdc-radio-button.mat-mdc-radio-disabled-interactive .mdc-radio--disabled .mdc-radio__background::before {
  background-color: var(--mat-radio-ripple-color, var(--mat-sys-on-surface));
}
.mat-mdc-radio-button .mat-internal-form-field {
  color: var(--mat-radio-label-text-color, var(--mat-sys-on-surface));
  font-family: var(--mat-radio-label-text-font, var(--mat-sys-body-medium-font));
  line-height: var(--mat-radio-label-text-line-height, var(--mat-sys-body-medium-line-height));
  font-size: var(--mat-radio-label-text-size, var(--mat-sys-body-medium-size));
  letter-spacing: var(--mat-radio-label-text-tracking, var(--mat-sys-body-medium-tracking));
  font-weight: var(--mat-radio-label-text-weight, var(--mat-sys-body-medium-weight));
}
.mat-mdc-radio-button .mdc-radio--disabled + label {
  color: var(--mat-radio-disabled-label-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent));
}
.mat-mdc-radio-button .mat-radio-ripple {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
}
.mat-mdc-radio-button .mat-radio-ripple > .mat-ripple-element {
  opacity: 0.14;
}
.mat-mdc-radio-button .mat-radio-ripple::before {
  border-radius: 50%;
}
.mat-mdc-radio-button .mdc-radio > .mdc-radio__native-control:focus:enabled:not(:checked) ~ .mdc-radio__background > .mdc-radio__outer-circle {
  border-color: var(--mat-radio-unselected-focus-icon-color, var(--mat-sys-on-surface));
}
.mat-mdc-radio-button.cdk-focused .mat-focus-indicator::before {
  content: "";
}

.mat-mdc-radio-disabled {
  cursor: default;
  pointer-events: none;
}
.mat-mdc-radio-disabled.mat-mdc-radio-disabled-interactive {
  pointer-events: auto;
}

.mat-mdc-radio-touch-target {
  position: absolute;
  top: 50%;
  left: 50%;
  height: var(--mat-radio-touch-target-size, 48px);
  width: var(--mat-radio-touch-target-size, 48px);
  transform: translate(-50%, -50%);
  display: var(--mat-radio-touch-target-display, block);
}
[dir=rtl] .mat-mdc-radio-touch-target {
  left: auto;
  right: 50%;
  transform: translate(50%, -50%);
}
`],encapsulation:2,changeDetection:0})}return n})(),qr=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=we({type:n});static \u0275inj=ke({imports:[Mo,Vn,Fe]})}return n})();function Oc(n,s){if(n&1&&(o(0,"mat-option",5),l(1),a()),n&2){let e=s.$implicit;g("value",It(e.value)),d(),v(e.label)}}function Fc(n,s){if(n&1&&(o(0,"span",11),l(1),a()),n&2){let e=u();d(),B("Moving average over the last ",e.smoothingWindow(),", about a quarter of the graph window.")}}var Hr=(()=>{class n{app=m(xi);_destroyRef=m(be);datasetAverageArray=S.required();showAverageData=S.required();showDataPoints=S.required();trackAgainstAverage=S.required();showDatasetMinimumValueLine=S.required();showDatasetMaximumValueLine=S.required();showDatasetAverageValueLine=S.required();showDatasetAngleAverageValueLine=S.required();verticalChart=S.required();inverseYAxis=S.required();showTimeScale=S.required();showYScale=S.required();startScaleAtZero=S.required();yScaleSuggestedMin=S.required();yScaleSuggestedMax=S.required();enableMinMaxScaleLimit=S.required();yScaleMin=S.required();yScaleMax=S.required();numDecimal=S.required();color=S.required();timeScale=S.required();period=S.required();colors=[];smoothingWindow=T("");ngOnInit(){this.colors=this.app.configurableThemeColors,this.showAverageData()&&!this.showAverageData()?.value&&(this.trackAgainstAverage().setValue(!1),this.trackAgainstAverage().disable()),this.refreshSmoothingWindow(),De(this.timeScale().valueChanges,this.period().valueChanges).pipe(q(this._destroyRef)).subscribe(()=>this.refreshSmoothingWindow()),this.enableMinMaxScaleLimit()&&this.setValueScaleOptionsControls(this.enableMinMaxScaleLimit().value)}refreshSmoothingWindow(){this.smoothingWindow.set(Vo(this.timeScale().value,this.period().value))}setValueScaleOptionsControls(e){e?(this.yScaleMin()?.enable(),this.yScaleMax()?.enable(),this.yScaleSuggestedMin()?.disable(),this.yScaleSuggestedMax()?.disable()):(this.yScaleMin()?.disable(),this.yScaleMax()?.disable(),this.yScaleSuggestedMin()?.enable(),this.yScaleSuggestedMax()?.enable())}setScaleControls(e){this.setValueScaleOptionsControls(e.value)}enableTrackAgainstMovingAverage(e){e.checked?this.trackAgainstAverage().enable():(this.trackAgainstAverage().setValue(e.checked),this.trackAgainstAverage().disable())}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["config-graph-display-options"]],inputs:{datasetAverageArray:[1,"datasetAverageArray"],showAverageData:[1,"showAverageData"],showDataPoints:[1,"showDataPoints"],trackAgainstAverage:[1,"trackAgainstAverage"],showDatasetMinimumValueLine:[1,"showDatasetMinimumValueLine"],showDatasetMaximumValueLine:[1,"showDatasetMaximumValueLine"],showDatasetAverageValueLine:[1,"showDatasetAverageValueLine"],showDatasetAngleAverageValueLine:[1,"showDatasetAngleAverageValueLine"],verticalChart:[1,"verticalChart"],inverseYAxis:[1,"inverseYAxis"],showTimeScale:[1,"showTimeScale"],showYScale:[1,"showYScale"],startScaleAtZero:[1,"startScaleAtZero"],yScaleSuggestedMin:[1,"yScaleSuggestedMin"],yScaleSuggestedMax:[1,"yScaleSuggestedMax"],enableMinMaxScaleLimit:[1,"enableMinMaxScaleLimit"],yScaleMin:[1,"yScaleMin"],yScaleMax:[1,"yScaleMax"],numDecimal:[1,"numDecimal"],color:[1,"color"],timeScale:[1,"timeScale"],period:[1,"period"]},decls:83,vars:22,consts:[["minLine",""],[1,"tab-content"],[1,"graph-flex-container"],[1,"full-width"],["placeholder","Select Color...","name","color","required","",3,"formControl"],[3,"value"],[1,"flex-item-rounded-card","rounded-card-color"],[2,"margin-left","10px"],["matInput","","type","number","min","0","max","5","placeholder","Enter or select number...","name","numDecimal","required","",3,"formControl"],["name","showDataPoints",1,"full-width",2,"margin-top","10px",3,"formControl"],["name","showAverageData",1,"full-width",3,"change","formControl"],[1,"mat-caption","graph-option-caption"],[1,"graph-option-subgroup"],[1,"no-margin"],["aria-label","Select the main series","name","trackAgainstAverage",1,"graph-option-radio-group",3,"formControl"],[1,"graph-option-radio-button",3,"value"],["name","verticalChart",3,"formControl"],[1,"no-margin",2,"margin-top","10px"],["name","showDatasetMaximumValueLine",1,"full-width",3,"formControl"],["name","showDatasetAverageValueLine",1,"full-width",3,"formControl"],["name","showDatasetMinimumValueLine",1,"full-width",3,"formControl"],[1,"mat-caption"],["aria-label","Select an option","name","enableMinMaxScaleLimit",1,"graph-option-radio-group",3,"formControl"],[1,"graph-option-radio-button",3,"change","value"],[1,"graph-option-radio-button-config"],[1,"graph-option-radio-button-config-form-field"],["matInput","","type","number","name","yScaleSuggestedMin",3,"formControl"],["matInput","","type","number","name","yScaleSuggestedMax",3,"formControl"],[1,"graph-option-radio-button-config-item"],["matInput","","type","number","name","yScaleMin","required","",3,"formControl"],["matInput","","type","number","name","yScaleMax","required","",3,"formControl"],["name","showYScale",1,"full-width",3,"formControl"],["name","inverseYAxis",3,"formControl"],["name","showTimeScale",1,"full-width",3,"formControl"]],template:function(t,i){t&1&&(o(0,"div",1)(1,"div",2)(2,"mat-form-field",3)(3,"mat-label"),l(4,"Color"),a(),o(5,"mat-select",4),I(6,Oc,2,3,"mat-option",5,oe),a()()(),o(8,"div",2)(9,"div",6)(10,"p"),l(11,"Series"),a(),o(12,"mat-form-field",7)(13,"mat-label"),l(14,"Value Decimal Places"),a(),b(15,"input",8),a(),o(16,"mat-checkbox",9),l(17," Display Data Points "),a(),o(18,"mat-checkbox",10),C("change",function(c){return i.enableTrackAgainstMovingAverage(c)}),l(19," Show Smoothed Trend "),a(),h(20,Fc,2,1,"span",11),o(21,"div",12)(22,"p",13),l(23,"Main Series"),a(),o(24,"mat-radio-group",14)(25,"mat-radio-button",15),l(26,"Live Value"),a(),o(27,"mat-radio-button",15),l(28,"Smoothed Trend"),a()(),o(29,"span",11),l(30,"The reading and the bold line follow the main series. The other one becomes the shaded band."),a()(),o(31,"mat-checkbox",16),l(32," Vertical Data Graph "),a(),o(33,"p",17),l(34,"Reference Lines"),a(),o(35,"mat-checkbox",18),l(36," Show Maximum Line "),a(),o(37,"mat-checkbox",19),l(38," Show Window Average Line "),a(),o(39,"mat-checkbox",20,0),l(41," Show Minimum Line "),a()(),o(42,"div",6)(43,"div")(44,"p",13),l(45,"Data Scale"),a(),o(46,"span",21),l(47,"(Default node is automatic scale)"),a(),o(48,"mat-radio-group",22)(49,"mat-radio-button",23),C("change",function(c){return i.setScaleControls(c)}),l(50,"Auto Scale"),a(),o(51,"div",24)(52,"mat-form-field",25)(53,"mat-label"),l(54,"Suggested Min"),a(),b(55,"input",26),a(),o(56,"mat-form-field",25)(57,"mat-label"),l(58,"Suggested Max"),a(),b(59,"input",27),a()(),o(60,"mat-radio-button",23),C("change",function(c){return i.setScaleControls(c)}),l(61," Fixed Scale "),a(),o(62,"div",24)(63,"div",28)(64,"mat-form-field",25)(65,"mat-label"),l(66,"Min"),a(),b(67,"input",29),a()(),o(68,"div",28)(69,"mat-form-field",25)(70,"mat-label"),l(71,"Max"),a(),b(72,"input",30),a()()()(),o(73,"mat-checkbox",31),l(74," Show Scale Ticks "),a(),o(75,"mat-checkbox",32),l(76," Inverse Scale "),a()()(),o(77,"div",6)(78,"div")(79,"p",13),l(80,"Time Scale"),a(),o(81,"mat-checkbox",33),l(82," Show Scale Ticks "),a()()()()()),t&2&&(d(5),g("formControl",i.color()),d(),A(i.colors),d(9),g("formControl",i.numDecimal()),d(),g("formControl",i.showDataPoints()),d(2),g("formControl",i.showAverageData()),d(2),f(i.smoothingWindow()?20:-1),d(4),g("formControl",i.trackAgainstAverage()),d(),g("value",!1),d(2),g("value",!0),d(4),g("formControl",i.verticalChart()),d(4),g("formControl",i.showDatasetMaximumValueLine()),d(2),g("formControl",i.showDatasetAverageValueLine()),d(2),g("formControl",i.showDatasetMinimumValueLine()),d(9),g("formControl",i.enableMinMaxScaleLimit()),d(),g("value",!1),d(6),g("formControl",i.yScaleSuggestedMin()),d(4),g("formControl",i.yScaleSuggestedMax()),d(),g("value",!0),d(7),g("formControl",i.yScaleMin()),d(5),g("formControl",i.yScaleMax()),d(),g("formControl",i.showYScale()),d(2),g("formControl",i.inverseYAxis()),d(6),g("formControl",i.showTimeScale()))},dependencies:[Go,he,te,Z,je,Ae,qe,Ee,ee,Zt,Te,ge,qr,Ca,Vn,J,fe,wt,Q,Me,Qt,Ci,Je],styles:[".graph-flex-container[_ngcontent-%COMP%]{display:flex;flex-direction:row;flex-wrap:wrap;margin:15px 0;gap:15px;align-items:stretch}.chart-panel-group[_ngcontent-%COMP%]{min-width:250px;flex-grow:1}.no-margin[_ngcontent-%COMP%]{margin:0}.graph-option-caption[_ngcontent-%COMP%]{display:block;margin:2px 0 6px;color:var(--mat-sys-outline)}.graph-option-subgroup[_ngcontent-%COMP%]{margin-left:25px}.graph-option-radio-group[_ngcontent-%COMP%]{display:flex;flex-direction:column;margin:0;align-items:flex-start}.graph-option-radio-button[_ngcontent-%COMP%]{margin:0}.graph-option-radio-button-config[_ngcontent-%COMP%]{margin-left:35px;display:flex;flex-direction:row;flex-wrap:wrap;gap:10px;align-items:flex-start}.graph-option-radio-button-config-item[_ngcontent-%COMP%]{flex-grow:0;flex-shrink:1;min-width:50px}.graph-option-radio-button-config-form-field[_ngcontent-%COMP%]{display:block;max-width:118px}"]})}return n})();var Nc=["panel"],Lc=["*"];function Vc(n,s){if(n&1&&(Xi(0,"div",1,0),re(2),Ji()),n&2){let e=s.id,t=u();Ue(t._classList),G("mat-mdc-autocomplete-visible",t.showPanel)("mat-mdc-autocomplete-hidden",!t.showPanel)("mat-autocomplete-panel-animations-enabled",!t._animationsDisabled)("mat-primary",t._color==="primary")("mat-accent",t._color==="accent")("mat-warn",t._color==="warn"),ut("id",t.id),$("aria-label",t.ariaLabel||null)("aria-labelledby",t._getPanelAriaLabelledby(e))}}var ya=class{source;option;constructor(s,e){this.source=s,this.option=e}},jr=new H("mat-autocomplete-default-options",{providedIn:"root",factory:()=>({autoActiveFirstOption:!1,autoSelectActiveOption:!1,hideSingleSelectionIndicator:!1,requireSelection:!1,hasBackdrop:!1})}),ti=(()=>{class n{_changeDetectorRef=m(Oe);_elementRef=m(X);_defaults=m(jr);_animationsDisabled=Ie();_activeOptionChanges=nt.EMPTY;_keyManager;showPanel=!1;get isOpen(){return this._isOpen&&this.showPanel}_isOpen=!1;_latestOpeningTrigger;_setColor(e){this._color=e,this._changeDetectorRef.markForCheck()}_color;template;panel;options;optionGroups;ariaLabel;ariaLabelledby;displayWith=null;autoActiveFirstOption;autoSelectActiveOption;requireSelection;panelWidth;disableRipple=!1;optionSelected=new j;opened=new j;closed=new j;optionActivated=new j;set classList(e){this._classList=e,this._elementRef.nativeElement.className=""}_classList;get hideSingleSelectionIndicator(){return this._hideSingleSelectionIndicator}set hideSingleSelectionIndicator(e){this._hideSingleSelectionIndicator=e,this._syncParentProperties()}_hideSingleSelectionIndicator;_syncParentProperties(){if(this.options)for(let e of this.options)e._changeDetectorRef.markForCheck()}id=m(ye).getId("mat-autocomplete-");inertGroups;constructor(){let e=m(ht);this.inertGroups=e?.SAFARI||!1,this.autoActiveFirstOption=!!this._defaults.autoActiveFirstOption,this.autoSelectActiveOption=!!this._defaults.autoSelectActiveOption,this.requireSelection=!!this._defaults.requireSelection,this._hideSingleSelectionIndicator=this._defaults.hideSingleSelectionIndicator??!1}ngAfterContentInit(){this._keyManager=new on(this.options).withWrap().skipPredicate(this._skipPredicate),this._activeOptionChanges=this._keyManager.change.subscribe(e=>{this.isOpen&&this.optionActivated.emit({source:this,option:this.options.toArray()[e]||null})}),this._setVisibility()}ngOnDestroy(){this._keyManager?.destroy(),this._activeOptionChanges.unsubscribe()}_setScrollTop(e){this.panel&&(this.panel.nativeElement.scrollTop=e)}_getScrollTop(){return this.panel?this.panel.nativeElement.scrollTop:0}_setVisibility(){this.showPanel=!!this.options?.length,this._changeDetectorRef.markForCheck()}_emitSelectEvent(e){let t=new ya(this,e);this.optionSelected.emit(t)}_getPanelAriaLabelledby(e){if(this.ariaLabel)return null;let t=e?e+" ":"";return this.ariaLabelledby?t+this.ariaLabelledby:e}_skipPredicate(){return!1}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["mat-autocomplete"]],contentQueries:function(t,i,r){if(t&1&&lt(r,ee,5)(r,_n,5),t&2){let c;O(c=F())&&(i.options=c),O(c=F())&&(i.optionGroups=c)}},viewQuery:function(t,i){if(t&1&&Pe(pi,7)(Nc,5),t&2){let r;O(r=F())&&(i.template=r.first),O(r=F())&&(i.panel=r.first)}},hostAttrs:[1,"mat-mdc-autocomplete"],inputs:{ariaLabel:[0,"aria-label","ariaLabel"],ariaLabelledby:[0,"aria-labelledby","ariaLabelledby"],displayWith:"displayWith",autoActiveFirstOption:[2,"autoActiveFirstOption","autoActiveFirstOption",D],autoSelectActiveOption:[2,"autoSelectActiveOption","autoSelectActiveOption",D],requireSelection:[2,"requireSelection","requireSelection",D],panelWidth:"panelWidth",disableRipple:[2,"disableRipple","disableRipple",D],classList:[0,"class","classList"],hideSingleSelectionIndicator:[2,"hideSingleSelectionIndicator","hideSingleSelectionIndicator",D]},outputs:{optionSelected:"optionSelected",opened:"opened",closed:"closed",optionActivated:"optionActivated"},exportAs:["matAutocomplete"],features:[ve([{provide:gn,useExisting:n}])],ngContentSelectors:Lc,decls:1,vars:0,consts:[["panel",""],["role","listbox",1,"mat-mdc-autocomplete-panel","mdc-menu-surface","mdc-menu-surface--open",3,"id"]],template:function(t,i){t&1&&(Ne(),Zi(0,Vc,3,17,"ng-template"))},styles:[`div.mat-mdc-autocomplete-panel {
  width: 100%;
  max-height: 256px;
  visibility: hidden;
  transform-origin: center top;
  overflow: auto;
  padding: 8px 0;
  box-sizing: border-box;
  position: relative;
  border-radius: var(--mat-autocomplete-container-shape, var(--mat-sys-corner-extra-small));
  box-shadow: var(--mat-autocomplete-container-elevation-shadow, 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12));
  background-color: var(--mat-autocomplete-background-color, var(--mat-sys-surface-container));
}
@media (forced-colors: active) {
  div.mat-mdc-autocomplete-panel {
    outline: solid 1px;
  }
}
.cdk-overlay-pane:not(.mat-mdc-autocomplete-panel-above) div.mat-mdc-autocomplete-panel {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
.mat-mdc-autocomplete-panel-above div.mat-mdc-autocomplete-panel {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  transform-origin: center bottom;
}
div.mat-mdc-autocomplete-panel.mat-mdc-autocomplete-visible {
  visibility: visible;
}

div.mat-mdc-autocomplete-panel.mat-mdc-autocomplete-hidden,
.cdk-overlay-pane:has(> .mat-mdc-autocomplete-hidden) {
  visibility: hidden;
  pointer-events: none;
}

@keyframes _mat-autocomplete-enter {
  from {
    opacity: 0;
    transform: scaleY(0.8);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.mat-autocomplete-panel-animations-enabled {
  animation: _mat-autocomplete-enter 120ms cubic-bezier(0, 0, 0.2, 1);
}

mat-autocomplete {
  display: none;
}
`],encapsulation:2,changeDetection:0})}return n})();var Gc={provide:Ht,useExisting:Vt(()=>Rt),multi:!0};var Bc=new H("mat-autocomplete-scroll-strategy",{providedIn:"root",factory:()=>{let n=m(_t);return()=>sn(n)}}),Rt=(()=>{class n{_environmentInjector=m(Na);_element=m(X);_injector=m(_t);_viewContainerRef=m(Yi);_zone=m(ae);_changeDetectorRef=m(Oe);_dir=m(Dt,{optional:!0});_formField=m(Xt,{optional:!0,host:!0});_viewportRuler=m(ui);_scrollStrategy=m(Bc);_renderer=m(Be);_animationsDisabled=Ie();_defaults=m(jr,{optional:!0});_overlayRef=null;_portal;_componentDestroyed=!1;_initialized=new me;_keydownSubscription;_outsideClickSubscription;_cleanupWindowBlur;_previousValue=null;_valueOnAttach=null;_valueOnLastKeydown=null;_positionStrategy;_manuallyFloatingLabel=!1;_closingActionsSubscription;_viewportSubscription=nt.EMPTY;_breakpointObserver=m(mo);_handsetLandscapeSubscription=nt.EMPTY;_canOpenOnNextFocus=!0;_valueBeforeAutoSelection;_pendingAutoselectedOption=null;_closeKeyEventStream=new me;_overlayPanelClass=co(this._defaults?.overlayPanelClass||[]);_windowBlurHandler=()=>{this._canOpenOnNextFocus=this.panelOpen||!this._hasFocus()};_onChange=()=>{};_onTouched=()=>{};autocomplete;position="auto";connectedTo;autocompleteAttribute="off";autocompleteDisabled=!1;constructor(){}_aboveClass="mat-mdc-autocomplete-panel-above";ngAfterViewInit(){this._initialized.next(),this._initialized.complete(),this._cleanupWindowBlur=this._renderer.listen("window","blur",this._windowBlurHandler)}ngOnChanges(e){e.position&&this._positionStrategy&&(this._setStrategyPositions(this._positionStrategy),this.panelOpen&&this._overlayRef.updatePosition())}ngOnDestroy(){this._cleanupWindowBlur?.(),this._handsetLandscapeSubscription.unsubscribe(),this._viewportSubscription.unsubscribe(),this._componentDestroyed=!0,this._destroyPanel(),this._closeKeyEventStream.complete(),this._clearFromModal()}get panelOpen(){return this._overlayAttached&&this.autocomplete.showPanel}_overlayAttached=!1;openPanel(){this._openPanelInternal()}closePanel(){this._resetLabel(),this._overlayAttached&&(this.panelOpen&&this._zone.run(()=>{this.autocomplete.closed.emit()}),this.autocomplete._latestOpeningTrigger===this&&(this.autocomplete._isOpen=!1,this.autocomplete._latestOpeningTrigger=null),this._overlayAttached=!1,this._pendingAutoselectedOption=null,this._overlayRef&&this._overlayRef.hasAttached()&&(this._overlayRef.detach(),this._closingActionsSubscription.unsubscribe()),this._updatePanelState(),this._componentDestroyed||this._changeDetectorRef.detectChanges(),this._trackedModal&&si(this._trackedModal,"aria-owns",this.autocomplete.id))}updatePosition(){this._overlayAttached&&this._overlayRef.updatePosition()}get panelClosingActions(){return De(this.optionSelections,this.autocomplete._keyManager.tabOut.pipe(rt(()=>this._overlayAttached)),this._closeKeyEventStream,this._getOutsideClickStream(),this._overlayRef?this._overlayRef.detachments().pipe(rt(()=>this._overlayAttached)):Ei()).pipe(at(e=>e instanceof Lo?e:null))}optionSelections=Hi(()=>{let e=this.autocomplete?this.autocomplete.options:null;return e?e.changes.pipe(Ke(e),Et(()=>De(...e.map(t=>t.onSelectionChange)))):this._initialized.pipe(Et(()=>this.optionSelections))});get activeOption(){return this.autocomplete&&this.autocomplete._keyManager?this.autocomplete._keyManager.activeItem:null}_getOutsideClickStream(){return new ni(e=>{let t=r=>{let c=an(r),p=this._formField?this._formField.getConnectedOverlayOrigin().nativeElement:null,_=this.connectedTo?this.connectedTo.elementRef.nativeElement:null;this._overlayAttached&&c!==this._element.nativeElement&&!this._hasFocus()&&(!p||!p.contains(c))&&(!_||!_.contains(c))&&this._overlayRef&&!this._overlayRef.overlayElement.contains(c)&&e.next(r)},i=[this._renderer.listen("document","click",t),this._renderer.listen("document","auxclick",t),this._renderer.listen("document","touchend",t)];return()=>{i.forEach(r=>r())}})}writeValue(e){Promise.resolve(null).then(()=>this._assignOptionValue(e))}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}setDisabledState(e){this._element.nativeElement.disabled=e}_handleKeydown(e){let t=e,i=t.keyCode,r=vt(t);if(i===27&&!r&&t.preventDefault(),this._valueOnLastKeydown=this._element.nativeElement.value,this.activeOption&&i===13&&this.panelOpen&&!r)this.activeOption._selectViaInteraction(),this._resetActiveItem(),t.preventDefault();else if(this.autocomplete){let c=this.autocomplete._keyManager.activeItem,p=i===38||i===40;i===9||p&&!r&&this.panelOpen?this.autocomplete._keyManager.onKeydown(t):p&&this._canOpen()&&this._openPanelInternal(this._valueOnLastKeydown),(p||this.autocomplete._keyManager.activeItem!==c)&&(this._scrollToOption(this.autocomplete._keyManager.activeItemIndex||0),this.autocomplete.autoSelectActiveOption&&this.activeOption&&(this._pendingAutoselectedOption||(this._valueBeforeAutoSelection=this._valueOnLastKeydown),this._pendingAutoselectedOption=this.activeOption,this._assignOptionValue(this.activeOption.value)))}}_handleInput(e){let t=e.target,i=t.value;if(t.type==="number"&&(i=i==""?null:parseFloat(i)),this._previousValue!==i){if(this._previousValue=i,this._pendingAutoselectedOption=null,(!this.autocomplete||!this.autocomplete.requireSelection)&&this._onChange(i),!i)this._clearPreviousSelectedOption(null,!1);else if(this.panelOpen&&!this.autocomplete.requireSelection){let r=this.autocomplete.options?.find(c=>c.selected);if(r){let c=this._getDisplayValue(r.value);i!==c&&r.deselect(!1)}}if(this._canOpen()&&this._hasFocus()){let r=this._valueOnLastKeydown??this._element.nativeElement.value;this._valueOnLastKeydown=null,this._openPanelInternal(r)}}}_handleFocus(){this._canOpenOnNextFocus?this._canOpen()&&(this._previousValue=this._element.nativeElement.value,this._attachOverlay(this._previousValue),this._floatLabel(!0)):this._canOpenOnNextFocus=!0}_handleClick(){this._canOpen()&&!this.panelOpen&&this._openPanelInternal()}_hasFocus(){return ro()===this._element.nativeElement}_floatLabel(e=!1){this._formField&&this._formField.floatLabel==="auto"&&(e?this._formField._animateAndLockLabel():this._formField.floatLabel="always",this._manuallyFloatingLabel=!0)}_resetLabel(){this._manuallyFloatingLabel&&(this._formField&&(this._formField.floatLabel="auto"),this._manuallyFloatingLabel=!1)}_subscribeToClosingActions(){let e=new ni(i=>{Bt(()=>{i.next()},{injector:this._environmentInjector})}),t=this.autocomplete.options?.changes.pipe(Ki(()=>this._positionStrategy.reapplyLastPosition()),Da(0))??Ei();return De(e,t).pipe(Et(()=>this._zone.run(()=>{let i=this.panelOpen;return this._resetActiveItem(),this._updatePanelState(),this._changeDetectorRef.detectChanges(),this.panelOpen&&this._overlayRef.updatePosition(),i!==this.panelOpen&&(this.panelOpen?this._emitOpened():this.autocomplete.closed.emit()),this.panelClosingActions})),ji(1)).subscribe(i=>this._setValueAndClose(i))}_emitOpened(){this.autocomplete.opened.emit()}_destroyPanel(){this._overlayRef&&(this.closePanel(),this._overlayRef.dispose(),this._overlayRef=null)}_getDisplayValue(e){let t=this.autocomplete;return t&&t.displayWith?t.displayWith(e):e}_assignOptionValue(e){let t=this._getDisplayValue(e);e==null&&this._clearPreviousSelectedOption(null,!1),this._updateNativeInputValue(t??"")}_updateNativeInputValue(e){this._formField?this._formField._control.value=e:this._element.nativeElement.value=e,this._previousValue=e}_setValueAndClose(e){let t=this.autocomplete,i=e?e.source:this._pendingAutoselectedOption;i?(this._clearPreviousSelectedOption(i),this._assignOptionValue(i.value),this._onChange(i.value),t._emitSelectEvent(i),this._element.nativeElement.focus()):t.requireSelection&&this._element.nativeElement.value!==this._valueOnAttach&&(this._clearPreviousSelectedOption(null),this._assignOptionValue(null),this._onChange(null)),this.closePanel()}_clearPreviousSelectedOption(e,t){this.autocomplete?.options?.forEach(i=>{i!==e&&i.selected&&i.deselect(t)})}_openPanelInternal(e=this._element.nativeElement.value){if(this._attachOverlay(e),this._floatLabel(),this._trackedModal){let t=this.autocomplete.id;Gi(this._trackedModal,"aria-owns",t)}}_attachOverlay(e){if(!this.autocomplete)return;let t=this._overlayRef;t?(this._positionStrategy.setOrigin(this._getConnectedElement()),t.updateSize({width:this._getPanelWidth()})):(this._portal=new ln(this.autocomplete.template,this._viewContainerRef,{id:this._formField?.getLabelId()}),t=So(this._injector,this._getOverlayConfig()),this._overlayRef=t,this._viewportSubscription=this._viewportRuler.change().subscribe(()=>{this.panelOpen&&t&&t.updateSize({width:this._getPanelWidth()})}),this._handsetLandscapeSubscription=this._breakpointObserver.observe(vo.HandsetLandscape).subscribe(r=>{r.matches?this._positionStrategy.withFlexibleDimensions(!0).withGrowAfterOpen(!0).withViewportMargin(8):this._positionStrategy.withFlexibleDimensions(!1).withGrowAfterOpen(!1).withViewportMargin(0)})),t&&!t.hasAttached()&&(t.attach(this._portal),this._valueOnAttach=e,this._valueOnLastKeydown=null,this._closingActionsSubscription=this._subscribeToClosingActions());let i=this.panelOpen;this.autocomplete._isOpen=this._overlayAttached=!0,this.autocomplete._latestOpeningTrigger=this,this.autocomplete._setColor(this._formField?.color),this._updatePanelState(),this._applyModalPanelOwnership(),this.panelOpen&&i!==this.panelOpen&&this._emitOpened()}_handlePanelKeydown=e=>{(e.keyCode===27&&!vt(e)||e.keyCode===38&&vt(e,"altKey"))&&(this._pendingAutoselectedOption&&(this._updateNativeInputValue(this._valueBeforeAutoSelection??""),this._pendingAutoselectedOption=null),this._closeKeyEventStream.next(),this._resetActiveItem(),e.stopPropagation(),e.preventDefault())};_updatePanelState(){if(this.autocomplete._setVisibility(),this.panelOpen){let e=this._overlayRef;this._keydownSubscription||(this._keydownSubscription=e.keydownEvents().subscribe(this._handlePanelKeydown)),this._outsideClickSubscription||(this._outsideClickSubscription=e.outsidePointerEvents().subscribe())}else this._keydownSubscription?.unsubscribe(),this._outsideClickSubscription?.unsubscribe(),this._keydownSubscription=this._outsideClickSubscription=void 0}_getOverlayConfig(){return new xo({positionStrategy:this._getOverlayPosition(),scrollStrategy:this._scrollStrategy(),width:this._getPanelWidth(),direction:this._dir??void 0,hasBackdrop:this._defaults?.hasBackdrop,backdropClass:this._defaults?.backdropClass||"cdk-overlay-transparent-backdrop",panelClass:this._overlayPanelClass,disableAnimations:this._animationsDisabled})}_getOverlayPosition(){let e=ko(this._injector,this._getConnectedElement()).withFlexibleDimensions(!1).withPush(!1).withPopoverLocation("inline");return this._setStrategyPositions(e),this._positionStrategy=e,e}_setStrategyPositions(e){let t=[{originX:"start",originY:"bottom",overlayX:"start",overlayY:"top"},{originX:"end",originY:"bottom",overlayX:"end",overlayY:"top"}],i=this._aboveClass,r=[{originX:"start",originY:"top",overlayX:"start",overlayY:"bottom",panelClass:i},{originX:"end",originY:"top",overlayX:"end",overlayY:"bottom",panelClass:i}],c;this.position==="above"?c=r:this.position==="below"?c=t:c=[...t,...r],e.withPositions(c)}_getConnectedElement(){return this.connectedTo?this.connectedTo.elementRef:this._formField?this._formField.getConnectedOverlayOrigin():this._element}_getPanelWidth(){return this.autocomplete.panelWidth||this._getHostWidth()}_getHostWidth(){return this._getConnectedElement().nativeElement.getBoundingClientRect().width}_resetActiveItem(){let e=this.autocomplete;if(e.autoActiveFirstOption){let t=-1;for(let i=0;i<e.options.length;i++)if(!e.options.get(i).disabled){t=i;break}e._keyManager.setActiveItem(t)}else e._keyManager.setActiveItem(-1)}_canOpen(){let e=this._element.nativeElement;return!e.readOnly&&!e.disabled&&!this.autocompleteDisabled}_scrollToOption(e){let t=this.autocomplete,i=bn(e,t.options,t.optionGroups);if(e===0&&i===1)t._setScrollTop(0);else if(t.panel){let r=t.options.toArray()[e];if(r){let c=r._getHostElement(),p=vn(c.offsetTop,c.offsetHeight,t._getScrollTop(),t.panel.nativeElement.offsetHeight);t._setScrollTop(p)}}}_trackedModal=null;_applyModalPanelOwnership(){let e=this._element.nativeElement.closest('body > .cdk-overlay-container [aria-modal="true"]');if(!e)return;let t=this.autocomplete.id;this._trackedModal&&si(this._trackedModal,"aria-owns",t),Gi(e,"aria-owns",t),this._trackedModal=e}_clearFromModal(){if(this._trackedModal){let e=this.autocomplete.id;si(this._trackedModal,"aria-owns",e),this._trackedModal=null}}static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,selectors:[["input","matAutocomplete",""],["textarea","matAutocomplete",""]],hostAttrs:[1,"mat-mdc-autocomplete-trigger"],hostVars:7,hostBindings:function(t,i){t&1&&C("focusin",function(){return i._handleFocus()})("blur",function(){return i._onTouched()})("input",function(c){return i._handleInput(c)})("keydown",function(c){return i._handleKeydown(c)})("click",function(){return i._handleClick()}),t&2&&$("autocomplete",i.autocompleteAttribute)("role",i.autocompleteDisabled?null:"combobox")("aria-autocomplete",i.autocompleteDisabled?null:"list")("aria-activedescendant",i.panelOpen&&i.activeOption?i.activeOption.id:null)("aria-expanded",i.autocompleteDisabled?null:i.panelOpen.toString())("aria-controls",i.autocompleteDisabled||!i.panelOpen||i.autocomplete==null?null:i.autocomplete.id)("aria-haspopup",i.autocompleteDisabled?null:"listbox")},inputs:{autocomplete:[0,"matAutocomplete","autocomplete"],position:[0,"matAutocompletePosition","position"],connectedTo:[0,"matAutocompleteConnectedTo","connectedTo"],autocompleteAttribute:[0,"autocomplete","autocompleteAttribute"],autocompleteDisabled:[2,"matAutocompleteDisabled","autocompleteDisabled",D]},exportAs:["matAutocompleteTrigger"],features:[ve([Gc]),Ge]})}return n})(),Mi=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=we({type:n});static \u0275inj=ke({imports:[dn,Zt,rn,Zt,Fe]})}return n})();var Gn=n=>{let s=n.parent?.value?.pathRequired!==!1,e=n.value;return s&&(e===null||e==="")?{required:!0}:null},zc=["string","number","boolean","object","undefined","function","symbol","bigint","Date"],Uc={number:{sends:"numeric",needs:"a number",pick:"numeric"},string:{sends:"text",needs:"text",pick:"text"},boolean:{sends:"true/false",needs:"a true/false value",pick:"true/false"},object:{sends:"structured",needs:"a structured value",pick:"structured"},Date:{sends:"date",needs:"a date",pick:"date"}},Kr=n=>Uc[n]??{sends:n,needs:`a ${n} value`,pick:n};function Bn(n,s,e){if(!n)return null;if(!s)return'Signal K is not sending this path. Check the spelling and the leading "self.", or keep it as-is if the instrument that sends it is switched off.';if(e.selfOnly&&!n.startsWith("self"))return'This path belongs to another vessel, and "Restrict to own vessel" is on for this widget. Turn that off, or use a path starting with "self.".';let t=zc.includes(e.pathType),i=t?s.type:s.meta?.type;if(t&&s.type===void 0)return"Signal K knows this path but has not sent a value yet, so its type cannot be checked. It should start working once data arrives.";if(i!==e.pathType){let r=Kr(i??"unknown").sends,c=Kr(e.pathType);return`This path sends ${r} values, but this setting needs ${c.needs}. The widget will show nothing until you pick a ${c.pick} path.`}return e.supportsPutOnly&&s.meta?.supportsPut!==!0?"This path is read-only. Signal K reports no PUT support for it, so this control cannot send commands to it.":e.zonesOnly&&!s.meta?.zones?.length?"This path has no alarm zones in its Signal K metadata, and this widget only offers paths that have them.":null}var Wc=(n,s)=>s.path;function $c(n,s){if(n&1){let e=P();o(0,"button",24),C("click",function(){y(e);let i=u();return x(i.clearPathInputField())}),o(1,"mat-icon"),l(2,"close"),a()()}}function qc(n,s){n&1&&(o(0,"mat-error"),l(1," Path is required. Please enter a valid Signal K path. "),a())}function Hc(n,s){if(n&1&&(o(0,"mat-hint",7),l(1),a()),n&2){let e=u();d(),v(e.pathWarning())}}function jc(n,s){if(n&1&&(o(0,"span"),l(1),a(),b(2,"br"),o(3,"small",25),l(4),a()),n&2){let e=u().$implicit;d(),v(e.path),d(3),v(e.meta.description)}}function Kc(n,s){if(n&1&&l(0),n&2){let e=u().$implicit;B(" ",e.path," ")}}function Qc(n,s){if(n&1&&(o(0,"mat-option",9),h(1,jc,5,2)(2,Kc,1,1),a()),n&2){let e=s.$implicit;g("value",e.path),d(),f(e.meta!==void 0?1:2)}}function Yc(n,s){if(n&1&&(o(0,"mat-option",13),l(1),a()),n&2){let e=s.$implicit;g("value",e),d(),B(" ",e==="default"?"Any":e," ")}}function Zc(n,s){n&1&&(o(0,"mat-form-field",14)(1,"mat-label"),l(2,"Angle display range"),a(),o(3,"mat-select",26)(4,"mat-option",13),l(5,"Automatic (based on path)"),a(),o(6,"mat-option",27),l(7,"Signed (-180\xB0 to 180\xB0)"),a(),o(8,"mat-option",28),l(9,"Compass (0\xB0 to 360\xB0)"),a()(),o(10,"mat-hint"),l(11,"Choose Signed for values that go negative (e.g. wind shift)."),a()()),n&2&&(d(3),g("formControl",s),d(),g("value",null))}var Qr=(()=>{class n{datachartAngleRange=S(void 0);filterSelfPaths=S.required();datachartPath=S.required();datachartSource=S.required();timeScale=S.required();period=S.required();data=m(tt);_destroyRef=m(be);numericPaths=T([]);filteredNumericPaths=T([]);pathSources=T([]);pathWarning=T(null);_sourcesForPath=null;pathUnit=T(null);maxDuration=ue(()=>this.timeScale().value==="day"?365:60);angleRangeControl=ue(()=>{let e=this.datachartAngleRange();if(!e)return;let t=this.pathUnit();return t===null||t==="rad"?e:void 0});ngOnInit(){this.refreshNumericPaths(),this.filteredNumericPaths.set(this.numericPaths()),this.datachartPath().valueChanges.pipe(Ki(t=>this.refreshPathUnit(t)),Lt(300),q(this._destroyRef)).subscribe(t=>{this.refreshNumericPaths();let i=(t||"").toLowerCase().trim();i?this.filteredNumericPaths.set(this.numericPaths().filter(r=>r.path.toLowerCase().includes(i))):this.filteredNumericPaths.set(this.numericPaths()),this.refreshPathWarning(t),t!==this._sourcesForPath&&(this.datachartSource().reset(),this.setPathSourcesFor(t))}),this.datachartPath().setValidators([Gn]),this.datachartPath().updateValueAndValidity({emitEvent:!1});let e=this.datachartPath()?.value;this.refreshPathWarning(e),this.refreshPathUnit(e),this.setPathSourcesFor(e),this.setInitFormState()}refreshNumericPaths(){this.numericPaths.set(this.getPaths())}refreshPathWarning(e){this.pathWarning.set(Bn(e,e?this.data.getPathObject(e):null,{pathType:"number",supportsPutOnly:!1,zonesOnly:!1,selfOnly:this.filterSelfPaths().value}))}refreshPathUnit(e){this.pathUnit.set(e?this.data.getPathUnitType(e):null)}setPathSourcesFor(e){this._sourcesForPath=e;let t=e?this.data.getPathObject(e):null;if(t){this.setPathSources(t);return}if(!e){this.pathSources.set([]);return}let i=this.datachartSource().value;this.pathSources.set(i&&i!=="default"?["default",i]:["default"]),i||this.datachartSource().setValue("default"),this.datachartSource().enable()}setInitFormState(e=!1){this.datachartSource().value&&!e?this.datachartSource().enable():(this.datachartSource().reset(),this.datachartSource().disable()),this.timeScale().value?this.timeScale().enable():this.timeScale().disable(),this.period().value?this.period().enable():this.period().disable()}getPaths(){return this.data.getPathsAndMetaByType("number",!1,!1,this.filterSelfPaths().value).sort()}clearPathInputField(){this.datachartPath().setValue(""),this.setInitFormState(!0)}changePath(e){let t=this.data.getPathObject(e.option.value);if(t===null){this.pathSources.set([]),this.datachartSource().reset(),this.datachartSource().disable();return}this.datachartSource().reset(),this.setPathSources(t)}setPathSources(e){this.pathSources.set(["default",...Object.keys(e.sources).sort()]),this.datachartSource().value||this.datachartSource().setValue("default"),this.datachartSource().enable()}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["config-graph-data-options"]],inputs:{datachartAngleRange:[1,"datachartAngleRange"],filterSelfPaths:[1,"filterSelfPaths"],datachartPath:[1,"datachartPath"],datachartSource:[1,"datachartSource"],timeScale:[1,"timeScale"],period:[1,"period"]},decls:54,vars:11,consts:[["pathInput",""],["pathAutoComplete","matAutocomplete"],[1,"display-content","tab-content"],[1,"flex-container",2,"margin-top","10px"],[1,"full-width"],["type","text","matInput","","placeholder","Type to use autocomplete or select from list","required","",3,"formControl","matAutocomplete"],["mat-icon-button","","matIconSuffix","","aria-label","Clear"],[1,"pathWarningHint"],[3,"optionSelected"],[2,"min-height","48px","line-height","1.15","height","auto","padding","8px 16px","white-space","normal",3,"value"],[3,"formControl"],[1,"flex-field-50"],["placeholder","Select data source","name","sourceControl","required","",3,"formControl"],[3,"value"],[1,"full-width",2,"margin-top","10px"],[2,"margin-top","10px"],["placeholder","Select graph time scale","name","timeScaleFormat","required","",3,"formControl"],["value","day"],["value","hour"],["value","minute"],["value","second"],["matInput","","type","number","min","1","step","1","placeholder","Enter or select number...","required","",3,"max","formControl"],[2,"grid-column","1 / -1","font-size","0.9em","color","var(--mat-sys-outline)"],["routerLink","/help/history-api",2,"color","var(--skip-blue-color)","cursor","pointer","text-decoration","underline"],["mat-icon-button","","matIconSuffix","","aria-label","Clear",3,"click"],[1,"pathMetaDescription"],["name","datachartAngleRange",3,"formControl"],["value","signed"],["value","direction"]],template:function(t,i){if(t&1&&(o(0,"div",2)(1,"div",3)(2,"mat-form-field",4)(3,"mat-label"),l(4," Signal K Path "),a(),b(5,"input",5,0),h(7,$c,3,0,"button",6),h(8,qc,2,0,"mat-error"),h(9,Hc,2,1,"mat-hint",7),o(10,"mat-autocomplete",8,1),C("optionSelected",function(c){return i.changePath(c)}),I(12,Qc,3,2,"mat-option",9,Wc),a()()(),o(14,"div",3)(15,"mat-checkbox",10),l(16," Restrict to own vessel "),a()(),o(17,"div",3)(18,"div",11)(19,"mat-form-field",4)(20,"mat-label"),l(21,"Source"),a(),o(22,"mat-select",12),I(23,Yc,2,2,"mat-option",13,_e),a()()()(),h(25,Zc,12,2,"mat-form-field",14),b(26,"br"),o(27,"p",15),l(28," Time scale and duration set how far back the graph shows \u2014 the graph window. Shorter windows show finer detail. "),a(),o(29,"div",3)(30,"div",11)(31,"mat-form-field",4)(32,"mat-label"),l(33,"Time Scale"),a(),o(34,"mat-select",16)(35,"mat-option",17),l(36,"Days"),a(),o(37,"mat-option",18),l(38,"Hours"),a(),o(39,"mat-option",19),l(40,"Minutes"),a(),o(41,"mat-option",20),l(42,"Seconds"),a()()()(),o(43,"div",11)(44,"mat-form-field",4)(45,"mat-label"),l(46,"Duration"),a(),b(47,"input",21),a()(),o(48,"div",22)(49,"strong"),l(50,"History API:"),a(),l(51," When the time scale is minutes or longer, the Data Graph can be pre-filled with historical data. "),o(52,"a",23),l(53,"Learn more"),a()()()()),t&2){let r,c=Y(6),p=Y(11);d(5),g("formControl",i.datachartPath())("matAutocomplete",p),d(2),f(c.value?7:-1),d(),f(c.validity.valueMissing?8:-1),d(),f(i.pathWarning()?9:-1),d(3),A(i.filteredNumericPaths()),d(3),g("formControl",i.filterSelfPaths()),d(7),g("formControl",i.datachartSource()),d(),A(i.pathSources()),d(2),f((r=i.angleRangeControl())?25:-1,r),d(9),g("formControl",i.timeScale()),d(13),g("max",i.maxDuration())("formControl",i.period())}},dependencies:[de,K,Mi,ti,ee,Rt,je,Ae,he,te,Z,ot,gt,Ot,qe,Ee,Te,ge,se,le,J,fe,wt,Q,Me,Qt,Ci,Je,Do],styles:[".display-content[_ngcontent-%COMP%]{display:block;width:100%;padding-top:15px;padding-bottom:10px}"]})}return n})();var Yr=(()=>{class n{transform(e){return Object.keys(e)}static \u0275fac=function(t){return new(t||n)};static \u0275pipe=za({name:"objectKeys",type:n,pure:!0})}return n})();var Zr=(n,s)=>s.path;function Xc(n,s){if(n&1&&(o(0,"mat-option",10),l(1),a()),n&2){let e=s.$implicit;g("value",e.path),d(),v(e.label)}}function Jc(n,s){if(n&1){let e=P();o(0,"div",5)(1,"mat-form-field",11)(2,"mat-label"),l(3,"Reference"),a(),o(4,"mat-select",12),C("selectionChange",function(){y(e);let i=u(2);return x(i.onPathChoiceChange())}),I(5,Xc,2,2,"mat-option",10,Zr),a()()()}if(n&2){let e=u(2);d(5),A(e.pathFormGroup().value.pathOptions)}}function em(n,s){n&1&&b(0,"i",20)}function tm(n,s){n&1&&b(0,"i",21)}function im(n,s){if(n&1&&(o(0,"mat-option",10),l(1),a()),n&2){let e=s.$implicit;g("value",e),d(),We("",e.properties.quantity,": ",e.properties.display)}}function nm(n,s){if(n&1){let e=P();o(0,"div",13)(1,"mat-form-field",19)(2,"mat-label"),h(3,em,1,0,"i",20)(4,tm,1,0,"i",21),l(5," Filter"),a(),o(6,"mat-select",22,2),C("selectionChange",function(){y(e),u();let i=Y(7),r=u(2);return x(r.pathFormGroup().controls.path.setValue(i.value))}),o(8,"mat-option"),l(9,"All"),a(),I(10,im,2,3,"mat-option",10,oe),a()()()}if(n&2){let e=Y(7),t=u(3);d(3),f(e.value?4:3),d(3),g("formControl",t.pathSkUnitsFilterControl),d(4),A(t.pathSkUnitsFiltersList)}}function am(n,s){n&1&&(o(0,"span",14),l(1,"(optional)"),a())}function om(n,s){if(n&1&&(o(0,"mat-hint",16),l(1),a()),n&2){let e=u(3);d(),v(e.pathWarning())}}function rm(n,s){n&1&&(o(0,"mat-hint"),l(1,"Leave blank to disable this path."),a())}function lm(n,s){if(n&1){let e=P();o(0,"button",23),C("click",function(){y(e);let i=u(3);return x(i.pathFormGroup().controls.path.setValue(""))}),o(1,"mat-icon"),l(2,"close"),a()()}}function sm(n,s){n&1&&(o(0,"mat-error"),l(1," Path is required. Please enter a valid Signal K path. "),a())}function dm(n,s){if(n&1&&(o(0,"span"),l(1),a(),b(2,"br"),o(3,"small",24),l(4),a()),n&2){let e=u().$implicit;d(),v(e.path),d(3),v(e.meta.description)}}function cm(n,s){if(n&1&&l(0),n&2){let e=u().$implicit;B(" ",e.path," ")}}function mm(n,s){if(n&1&&(o(0,"mat-option",18),h(1,dm,5,2)(2,cm,1,1),a()),n&2){let e=s.$implicit;g("value",e.path),d(),f(e.meta!==void 0?1:2)}}function pm(n,s){if(n&1&&(h(0,nm,12,2,"div",13),o(1,"div",5)(2,"mat-form-field",11)(3,"mat-label"),l(4," Signal K Path "),h(5,am,2,0,"span",14),a(),b(6,"input",15,0),h(8,om,2,1,"mat-hint",16)(9,rm,2,0,"mat-hint"),h(10,lm,3,0,"button",17),h(11,sm,2,0,"mat-error"),o(12,"mat-autocomplete",null,1),I(14,mm,3,2,"mat-option",18,Zr),Ce(16,"async"),a()()()),n&2){let e,t=Y(13),i=u(2);f(i.pathFormGroup().value.pathType==="number"&&i.showPathSkUnitsFilter?0:-1),d(5),f(i.pathFormGroup().value.pathRequired===!1?5:-1),d(),g("matAutocomplete",t),d(2),f(i.pathWarning()?8:i.pathFormGroup().value.pathRequired===!1?9:-1),d(2),f(i.pathFormGroup().value.path?10:-1),d(),f((e=i.pathFormGroup().controls.path.errors)!=null&&e.required?11:-1),d(3),A(Le(16,6,i.filteredPaths))}}function um(n,s){if(n&1&&(o(0,"mat-option",10),l(1),a()),n&2){let e=s.$implicit;g("value",e),d(),B(" ",e==="default"?"Any":e," ")}}function hm(n,s){if(n&1&&(o(0,"div",3)(1,"div",4)(2,"span"),l(3),a()(),h(4,Jc,7,0,"div",5)(5,pm,17,8),o(6,"div",6)(7,"div",7)(8,"mat-form-field",8)(9,"mat-label"),l(10,"Data Source"),a(),o(11,"mat-select",9),I(12,um,2,2,"mat-option",10,oe),a()()()()()),n&2){let e,t=u();g("formGroup",t.pathFormGroup()),d(2),zt("color",t.pathFormGroup().controls.path.disabled?"var(--mat-sys-on-surface-variant)":""),d(),v(t.pathFormGroup().value.description),d(),f((e=t.pathFormGroup().value.pathOptions)!=null&&e.length?4:t.pathFormGroup().value.isPathConfigurable?5:-1),d(8),A(t.availableSources)}}var Xr=(()=>{class n{_data=m(tt);_units=m(xn);_connection=m(cn);_destroyRef=m(be);pathFormGroup=S.required();multiCTRLArray=S.required();filterSelfPaths=S.required();availablePaths=[];filteredPaths=new $n(null);pathWarning=T(null);_derivedForPath=null;availableSources=[];unitList={base:"",conversions:[]};showPathSkUnitsFilter=!1;pathSkUnitsFilterControl=new gi(null);pathSkUnitsFiltersList=[];unitlessUnit={unit:"unitless",properties:{display:"(null)",quantity:"Unitless",quantityDisplay:"(null)",description:""}};ngOnInit(){let e=this.pathFormGroup();if((e.value.pathOptions?.length??0)>0||e.controls.path.disabled){this.setupSourceFor(e.controls.path.value);return}this.pathSkUnitsFiltersList=this._units.skBaseUnits.sort((i,r)=>i.properties.quantity>r.properties.quantity?1:-1),this.pathSkUnitsFiltersList.unshift(this.unitlessUnit),e.value.pathSkUnitsFilter&&this.pathSkUnitsFilterControl.setValue(this.pathSkUnitsFiltersList.find(i=>i.unit===this.pathFormGroup().value.pathSkUnitsFilter)??null,{onlySelf:!0}),e.value.showPathSkUnitsFilter&&(this.showPathSkUnitsFilter=e.value.showPathSkUnitsFilter),e.controls.path.setValidators([Gn]),e.controls.path.updateValueAndValidity({onlySelf:!0,emitEvent:!1}),this.refreshPathWarning(),e.controls.pathRequired&&e.controls.pathRequired.valueChanges.pipe(q(this._destroyRef)).subscribe(()=>{this.pathFormGroup().controls.path.updateValueAndValidity()}),e.controls.path.valid?this.enableFormFields(!1):this.disablePathFields(),e.controls.path.valueChanges.pipe(Aa(i=>i===""?Ii(0):Ii(350)),Ke(""),at(i=>this.filterPaths(i||""))).pipe(q(this._destroyRef)).subscribe(()=>{let i=this.pathFormGroup();if(this.refreshPathWarning(),!i.controls.path.pristine){let r=i.controls.path.value;i.controls.path.valid?(this.enableFormFields(r!==this._derivedForPath),this.updatePathMetaBoundDisplayName(r),this.updatePathMetaBoundDisplayScale(r)):this.disablePathFields()}}),e.controls.pathType.valueChanges.pipe(q(this._destroyRef)).subscribe(()=>{let i=this.pathFormGroup();i.value.showPathSkUnitsFilter?this.pathSkUnitsFilterControl.setValue(this.unitlessUnit):this.pathSkUnitsFilterControl.setValue(null),i.controls.path.updateValueAndValidity(),this.refreshPathWarning()})}ngOnChanges(e){e.filterSelfPaths&&!e.filterSelfPaths.firstChange&&(this.pathFormGroup().controls.path.updateValueAndValidity(),this.refreshPathWarning())}refreshPathWarning(){let e=this.pathFormGroup().controls.path.value;this.pathWarning.set(Bn(e,this._data.getPathObject(e),this.slotRequirements()))}slotRequirements(){let e=this.pathFormGroup(),t=!1;if(e.value.supportsPut){let i=!1;this.multiCTRLArray().length>0&&(i=this.multiCTRLArray().some(r=>r.pathID===this.pathFormGroup().value.pathID&&r.type==="3")),i?t=!1:t=this._connection.skServerVersion!=null&&Eo(this._connection.skServerVersion,"2.12.0",">=")?e.value.supportsPut:!1}return{pathType:e.controls.pathType.value,supportsPutOnly:t,zonesOnly:e.value.zonesOnlyPaths??!1,selfOnly:this.filterSelfPaths()}}getPaths(){let e=this.slotRequirements();return this._data.getPathsAndMetaByType(e.pathType,e.supportsPutOnly,e.zonesOnly,e.selfOnly).sort()}filterPaths(e){let t=e.toLowerCase(),i=this.getPaths();if(this.pathSkUnitsFilterControl.value){let r=this.pathSkUnitsFilterControl.value.unit;i=i.filter(c=>{let p=!!c.meta&&!!c.meta.units,_=r==="unitless";return p&&c.meta?.units===r||!p&&_})}i=i.filter(r=>r.path.toLowerCase().includes(t)),this.filteredPaths.next(i)}setupSourceFor(e){let t=e?this._data.getPathObject(e):null,i=this.pathFormGroup().controls.source,r=i.value;t!=null?(this.availableSources=["default",...Object.keys(t.sources).sort()],(!r||!this.availableSources.includes(r))&&i.setValue("default",{onlySelf:!0})):(this.availableSources=r&&r!=="default"?["default",r]:["default"],r||i.setValue("default",{onlySelf:!0})),i.enable({onlySelf:!1})}onPathChoiceChange(){this.setupSourceFor(this.pathFormGroup().controls.path.value)}enableFormFields(e){let t=this.pathFormGroup().controls.path.value;this._derivedForPath=t;let i=this._data.getPathObject(t);if(i!=null){let r=this.pathFormGroup();r.controls.pathType.value=="number"&&(this.unitList=this._units.getConversionsForPath(r.controls.path.value),e&&r.controls.convertUnitTo.setValue(this.unitList.base,{onlySelf:!0}),r.controls.convertUnitTo.enable({onlySelf:!1})),this.availableSources=["default",...Object.keys(i.sources).sort()];let c=r.controls.source;(e||!c.value)&&c.setValue("default",{onlySelf:!0}),c.enable({onlySelf:!1})}else if(t){let r=this.pathFormGroup();r.controls.pathType.value=="number"&&(e&&r.controls.convertUnitTo.setValue("",{onlySelf:!0}),r.controls.convertUnitTo.enable({onlySelf:!1})),e&&r.controls.source.setValue("default",{onlySelf:!0}),this.setupSourceFor(t)}else this.disablePathFields()}disablePathFields(){this.pathFormGroup().controls.source.reset("",{onlySelf:!0}),this.pathFormGroup().controls.source.disable({onlySelf:!1});let e=this.pathFormGroup();e.controls.pathType.value=="number"&&(e.controls.convertUnitTo.reset("",{onlySelf:!0}),e.controls.convertUnitTo.disable({onlySelf:!1}))}updatePathMetaBoundDisplayName(e){let t=this.pathFormGroup();if(!t.parent?.parent?.value||!Object.prototype.hasOwnProperty.call(t.parent.parent.value,"displayName"))return;let i=this._data.getPathMeta(e);i?.displayName&&"displayName"in t.parent.parent.controls&&t.parent.parent.get("displayName")?.setValue(i.displayName)}updatePathMetaBoundDisplayScale(e){let t=this.pathFormGroup();if(!t.parent?.parent?.value||!Object.prototype.hasOwnProperty.call(t.parent.parent.value,"displayScale"))return;let i=this._data.getPathMeta(e);if(i?.displayScale){let r=t.parent.parent.get("displayScale");if(!r)return;let c=t.controls.convertUnitTo.value;i.displayScale.lower!==null&&i.displayScale.lower!==void 0&&r.controls.lower.setValue(this._units.convertToUnit(c,i.displayScale.lower)),i.displayScale.upper!==null&&i.displayScale.upper!==void 0&&r.controls.upper.setValue(this._units.convertToUnit(c,i.displayScale.upper)),i.displayScale.type!==null&&i.displayScale.type!==void 0&&r.controls.type.setValue(i.displayScale.type),i.displayScale.power!==null&&i.displayScale.power!==void 0&&r.controls.power.setValue(i.displayScale.power)}}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["path-control-config"]],inputs:{pathFormGroup:[1,"pathFormGroup"],multiCTRLArray:[1,"multiCTRLArray"],filterSelfPaths:[1,"filterSelfPaths"]},features:[Ge],decls:1,vars:1,consts:[["pathInput",""],["pathAutoComplete","matAutocomplete"],["pathUnitsFilter",""],[1,"flex-container","rounded-card","rounded-card-color",3,"formGroup"],[1,"flex-field-100"],[1,"flex-field-to-100"],[1,"pathProperties"],[1,"sourceField"],["appearance","outline","floatLabel","always",1,"fields"],["placeholder","Select source","formControlName","source","required",""],[3,"value"],["floatLabel","auto","appearance","fill",1,"pathField"],["formControlName","path",3,"selectionChange"],[1,"flex-field-fixed"],[1,"optional-label"],["type","text","matInput","","placeholder","Type to use autocomplete or select from list","formControlName","path",3,"matAutocomplete"],[1,"pathWarningHint"],["mat-icon-button","","type","button","matIconSuffix","","aria-label","Clear"],[2,"min-height","48px","line-height","1.15","height","auto","padding","8px 16px","white-space","normal",3,"value"],["floatLabel","auto","appearance","fill",1,"filter-path"],[1,"fa-solid","fa-filter"],[1,"fa-solid","fa-filter-circle-xmark"],["panelWidth","",3,"selectionChange","formControl"],["mat-icon-button","","type","button","matIconSuffix","","aria-label","Clear",3,"click"],[1,"pathMetaDescription"]],template:function(t,i){t&1&&h(0,hm,14,5,"div",3),t&2&&f(i.pathFormGroup().value.hideFromConfig?-1:0)},dependencies:[$e,fe,Q,ce,Me,J,Je,U,Re,te,Z,ge,Mi,ti,ee,Rt,le,Ot,gt,Ee,de,K,ot,nn],styles:[".pathGroup[_ngcontent-%COMP%]{width:100%}.pathGroupFields[_ngcontent-%COMP%]{display:block;width:calc(100% - 5px)}.pathField[_ngcontent-%COMP%]{width:100%}.pathProperties[_ngcontent-%COMP%]{display:flex;flex-flow:row wrap;justify-content:space-between;align-items:center;align-content:flex-start;gap:10px}.fields[_ngcontent-%COMP%]{width:100%}.sourceField[_ngcontent-%COMP%], .unitField[_ngcontent-%COMP%]{flex:3 1}"]})}return n})();function fm(n,s){if(n&1&&b(0,"path-control-config",2),n&2){let e=s.$implicit,t=u(2);g("pathFormGroup",e)("filterSelfPaths",t.filterSelfPaths().value)("multiCTRLArray",t.multiCTRLArray)}}function gm(n,s){if(n&1&&I(0,fm,1,3,"path-control-config",2,oe),n&2){let e=u();A(e.pathControlGroups)}}function _m(n,s){if(n&1&&b(0,"path-control-config",2),n&2){let e=s.$implicit,t=u(2);g("pathFormGroup",t.pathGroupByKey(e))("filterSelfPaths",t.filterSelfPaths().value)("multiCTRLArray",t.multiCTRLArray)}}function bm(n,s){if(n&1&&(I(0,_m,1,3,"path-control-config",2,oe),Ce(2,"objectKeys")),n&2){let e=u();A(Le(2,0,e.pathsGroup.controls))}}var Jr=(()=>{class n{rootFormGroup=m(U);fb=m(Yt);formGroupName=S.required();isArray=S.required();filterSelfPaths=S.required();addPathEvent=S();delPathEvent=S();updatePathEvent=S();pathsFormGroup;multiCTRLArray=[];get pathsGroup(){return this.pathsFormGroup}get pathControlGroups(){return this.pathsFormGroup.controls}pathGroupByKey(e){return this.pathsGroup.get(e)}ngOnInit(){this.isArray()?(this.pathsFormGroup=this.rootFormGroup.control.get(this.formGroupName()),this.multiCTRLArray=this.rootFormGroup.control.get("multiChildCtrls")?.value??[]):this.pathsFormGroup=this.rootFormGroup.control.get(this.formGroupName())}addPath(e){this.pathsFormGroup instanceof ft&&(this.pathsFormGroup.push(this.fb.group({description:[e.path.description],path:[e.path.path,z.required],pathID:[e.path.pathID],source:[e.path.source,z.required],pathType:[e.path.pathType],zonesOnlyPaths:[e.path.zonesOnlyPaths??!1],isPathConfigurable:[e.path.isPathConfigurable],showPathSkUnitsFilter:[e.path.showPathSkUnitsFilter],pathSkUnitsFilter:[e.path.pathSkUnitsFilter],convertUnitTo:[e.path.convertUnitTo],supportsPut:[e.path.supportsPut]})),this.pathsFormGroup.updateValueAndValidity(),this.multiCTRLArray=this.rootFormGroup.control.get("multiChildCtrls")?.value??[])}delPath(){this.multiCTRLArray=this.rootFormGroup.control.get("multiChildCtrls")?.value??[]}updatePath(e){this.multiCTRLArray=e}ngOnChanges(e){e.addPathEvent&&!e.addPathEvent.firstChange&&this.addPath(e.addPathEvent.currentValue),e.delPathEvent&&!e.delPathEvent.firstChange&&this.delPath(),e.updatePathEvent&&!e.updatePathEvent.firstChange&&this.updatePath(e.updatePathEvent.currentValue)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["paths-options"]],inputs:{formGroupName:[1,"formGroupName"],isArray:[1,"isArray"],filterSelfPaths:[1,"filterSelfPaths"],addPathEvent:[1,"addPathEvent"],delPathEvent:[1,"delPathEvent"],updatePathEvent:[1,"updatePathEvent"]},features:[Ge],decls:5,vars:3,consts:[[3,"formGroup"],["name","filterSelfPaths",3,"formControl"],[2,"display","block",3,"pathFormGroup","filterSelfPaths","multiCTRLArray"]],template:function(t,i){t&1&&(en(0,0),h(1,gm,2,0)(2,bm,3,2),tn(),o(3,"mat-checkbox",1),l(4,` Restrict to own vessel
`),a()),t&2&&(g("formGroup",i.pathsGroup),d(),f(i.isArray()?1:2),d(2),g("formControl",i.filterSelfPaths()))},dependencies:[Ae,$e,Q,ce,J,Je,U,Xr,Yr],styles:["[_nghost-%COMP%]{display:block;height:100%;width:100%;padding-top:15px;padding-bottom:5px}"]})}return n})();function vm(n,s){if(n&1){let e=P();o(0,"button",7),C("click",function(){y(e);let i=u();return x(i.dateTimezone().setValue(""))}),b(1,"span",8),a()}}function Cm(n,s){if(n&1&&(o(0,"mat-option",6),l(1),a()),n&2){let e=s.$implicit;g("value",e.label),d(),We(" ",e.offset," - ",e.label," ")}}function ym(n){return s=>n.some(t=>t.label===s.value)?null:{requireMatch:!0}}var xm=()=>{let n=Intl.supportedValuesOf("timeZone"),s=new Date;return n.map(e=>({offset:new Intl.DateTimeFormat("en-US",{timeZone:e,timeZoneName:"shortOffset"}).formatToParts(s).find(c=>c.type==="timeZoneName")?.value||"",label:e}))},el=(()=>{class n{_destroyRef=m(be);dateFormat=S.required();dateTimezone=S.required();tz=[];filteredTZ;filteredTZSubscription=null;constructor(){}ngOnInit(){this.tz=xm().sort((e,t)=>this.compareOffsets(e.offset,t.offset)),this.tz.unshift({offset:"",label:"System Timezone -"}),this.dateTimezone().setValidators([z.required,ym(this.tz)]),this.filteredTZ=this.dateTimezone().valueChanges.pipe(Lt(500),Ke(""),at(e=>this.filterTZ(e||""))),this.filteredTZSubscription=this.filteredTZ.pipe(q(this._destroyRef)).subscribe()}filterTZ(e){let t=e.toLowerCase();return this.tz.filter(i=>i.label.toLowerCase().includes(t))}compareOffsets(e,t){let i=r=>{let c=r.match(/([+-]?)(\d+)(?::(\d+))?/);if(!c)return 0;let p=c[1]==="-"?-1:1,_=parseInt(c[2],10),k=c[3]?parseInt(c[3],10):0;return p*(_*60+k)};return i(e)-i(t)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["display-datetime-options"]],inputs:{dateFormat:[1,"dateFormat"],dateTimezone:[1,"dateTimezone"]},decls:15,vars:6,consts:[["timeZoneAutoComplete","matAutocomplete"],[1,"widget-options-grid"],[1,"options-grid-span2"],["matInput","","placeholder","dd/MM/yyyy HH:mm:ss","name","dateFormat","required","",3,"formControl"],["type","text","matInput","","placeholder","Type to use autocomplete","name","dateTimezone","required","",3,"formControl","matAutocomplete"],["mat-icon-button","","matSuffix","","aria-label","Clear"],[3,"value"],["mat-icon-button","","matSuffix","","aria-label","Clear",3,"click"],[1,"fa-solid","fa-close"]],template:function(t,i){if(t&1&&(o(0,"div",1)(1,"mat-form-field",2)(2,"mat-label"),l(3,"Date & Time Format"),a(),b(4,"input",3),a(),o(5,"mat-form-field",2)(6,"mat-label"),l(7,"Adjust Value to Time Zone"),a(),b(8,"input",4),h(9,vm,2,0,"button",5),o(10,"mat-autocomplete",null,0),I(12,Cm,2,3,"mat-option",6,_e),Ce(14,"async"),a()()()),t&2){let r=Y(11);d(4),g("formControl",i.dateFormat()),d(4),g("formControl",i.dateTimezone())("matAutocomplete",r),d(),f(i.dateTimezone().value?9:-1),d(3),A(Le(14,4,i.filteredTZ))}},dependencies:[te,Z,ge,$e,fe,Q,Me,J,Je,Rt,le,Ot,ti,ee,nn],encapsulation:2})}return n})();function km(n,s){if(n&1&&(o(0,"mat-option",6),l(1),Ce(2,"titlecase"),a()),n&2){let e=s.$implicit;g("value",It(e)),d(),v(Le(2,3,e))}}var ka={V1_PLUGIN:"autopilot",V2_BASE:"/signalk/v2/api",V2_AUTOPILOTS:"/signalk/v2/api/vessels/self/autopilots",V2_DEFAULT_AUTOPILOT_ID:"/signalk/v2/api/vessels/self/autopilots/_providers/_default"},tl={options:{modes:[],states:[]},state:null,mode:"off-line",target:null,engaged:!1},il=(()=>{class n{formGroupName=S.required();_pluginConfig=m(kn);_destroyRef=m(be);http=m(no);rootFormGroup=m(U);autopilotFormGroup;apiVersion=T(null);availableAutopilots=T({});autopilotPlugin=T(null);discoveryInProgress=T(!1);apiDetectionError=T(null);apInstances=ue(()=>{let e=this.availableAutopilots();return e?Object.keys(e):[]});modes=T(null);pluginId=T(null);currentRequests=new Set;constructor(){Gt(()=>{this.autopilotFormGroup.get("apiVersion")?.setValue(this.apiVersion(),{emitEvent:!1})})}ngOnInit(){this.autopilotFormGroup=this.rootFormGroup.control.get(this.formGroupName()),this.modes.set(this.autopilotFormGroup.value.modes||null),this.detectAutopilotApi()}detectAutopilotApi(){return N(this,null,function*(){this.discoveryInProgress.set(!0),console.log("[Autopilot Options] Starting API detection...");try{if(yield this.checkV2Api())if(this.apiVersion.set("v2"),this.autopilotFormGroup.get("apiVersion")?.setValue("v2",{emitEvent:!1}),this.availableAutopilots()&&Object.keys(this.availableAutopilots()).length>0){this.pluginId.set(Object.values(this.availableAutopilots())[0]?.provider??null),this.autopilotFormGroup.get("pluginId")?.setValue(this.pluginId(),{emitEvent:!1}),this.discoveryInProgress.set(!1);return}else console.warn("[Autopilot Options] No V2 autopilot provider found")}catch(e){console.error("[Autopilot Options] Error checking V2 API, checking V1...",e)}try{let e=yield this._pluginConfig.getPlugin(ka.V1_PLUGIN);if(e.ok&&e.data.state.enabled){this.apiVersion.set("v1"),this.autopilotFormGroup.get("apiVersion")?.setValue("v1",{emitEvent:!1}),this.availableAutopilots.set({"Default Autopilot":{provider:"Signal K Autopilot",isDefault:!0}}),this.pluginId.set("Signal K Autopilot"),this.autopilotFormGroup.get("pluginId")?.setValue("Signal K Autopilot",{emitEvent:!1}),console.log("[Autopilot Options] V1 API Signal K Autopilot plugin detected"),this.discoveryInProgress.set(!1);return}console.log("[Autopilot Options] V1 API plugin (signalk-autopilot) not found")}catch(e){console.error("[Autopilot Options] V1 plugin detection failed:",e)}console.warn("[Autopilot Options] No Autopilot detected"),this.discoveryInProgress.set(!1)})}checkV2Api(){return N(this,null,function*(){try{let e=yield qn(this.makeHttpRequest(this.http.get(ka.V2_AUTOPILOTS,{observe:"response",responseType:"json"})));return e&&e.body&&Object.keys(e.body).length>0?(this.availableAutopilots.set(e.body),console.log("[Autopilot Options] Discovered V2 API autopilot providers:",JSON.stringify(e.body))):(this.availableAutopilots.set({}),console.warn("[Autopilot Options] No V2 autopilot provider plugin found.")),e?.status===200}catch(e){if(e&&typeof e=="object"&&"status"in e){let t=e;t.status===404?console.log("[Autopilot Options] V2 API endpoint not found (404)"):t.status>=500?console.warn("[Autopilot Options] V2 API server error:",t.status,t.statusText):console.log("[Autopilot Options] V2 API call to discover Autopilot Providers failed:",t.status,t.statusText)}else console.log("[Autopilot Options] V2 API network error:",e);return!1}})}discoverV2AutopilotOptions(e){return N(this,null,function*(){let t;try{try{this.discoveryInProgress.set(!0),t=yield qn(this.makeHttpRequest(this.http.get(`${ka.V2_AUTOPILOTS}/${e}`))),console.log("[Autopilot Options] V2 Autopilot Options response:",JSON.stringify(t))}catch(i){t=tl,console.log(`[Autopilot Options] Default AP discovery endpoint error for instance '${e}'`)}return this.discoveryInProgress.set(!1),t}catch(i){return console.error("[Autopilot Options] Failed to discover V2 endpoints:",i),console.log(`[Autopilot Options] Using fallback V2 endpoints for instance '${e}'`),tl}})}onAutopilotInstanceIdChange(e){let t=e.value;if(e.value===""){this.modes.set(""),this.autopilotFormGroup.get("modes")?.setValue("",{emitEvent:!1});return}console.log("[Autopilot Options] Selected Autopilot Instance ID:",t),this.apiVersion()==="v2"?this.discoverV2AutopilotOptions(t).then(i=>{let r=i.options.modes||[];this.modes.set(r.join(", ")),this.autopilotFormGroup.get("modes")?.setValue(r,{emitEvent:!1}),console.log("[Autopilot Options] Autopilot plugin supported modes :",r.join(", "))}).catch(i=>{console.error("[Autopilot Options] Error requesting autopilot modes:",i),this.autopilotFormGroup.get("modes")?.setValue([],{emitEvent:!1})}):this.apiVersion()==="v1"&&(this.modes.set("standby, auto, wind, route"),this.autopilotFormGroup.get("modes")?.setValue("standby, auto, wind, route",{emitEvent:!1}),console.log("[Autopilot Options] Autopilot mode set to Raymarine v1 API modes: standby, auto, wind, route"))}makeHttpRequest(e){let t=e.pipe(q(this._destroyRef));return this.currentRequests.add(t),t.pipe(Pa(()=>this.currentRequests.delete(t)))}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["select-autopilot"]],inputs:{formGroupName:[1,"formGroupName"]},decls:30,vars:4,consts:[[1,"display-content","tab-content"],[1,"autopilot-options",3,"formGroup"],[1,"flex-item-rounded-card","rounded-card-color",2,"margin-block","10px"],[2,"margin-block-start","0px"],["placeholder","Select autopilot...","formControlName","instanceId","name","instanceId","required","",3,"selectionChange"],["value",""],[3,"value"],[1,"flex-item-rounded-card","rounded-card-color",2,"margin-block","10px","margin-left","10px","margin-right","10px"],["name","headingDirectionTrue","formControlName","headingDirectionTrue"],["name","invertRudder","formControlName","invertRudder"]],template:function(t,i){t&1&&(o(0,"div",0)(1,"div",1)(2,"div",2)(3,"h3",3),l(4,"Signal K Service Discovery"),a(),o(5,"ul")(6,"li")(7,"b"),l(8,"API Version:"),a(),l(9),a(),o(10,"li")(11,"b"),l(12,"Plugin:"),a(),l(13),a()()(),o(14,"mat-form-field")(15,"mat-label"),l(16,"Target Autopilot"),a(),o(17,"mat-select",4),C("selectionChange",function(c){return i.onAutopilotInstanceIdChange(c)}),o(18,"mat-option",5),l(19,"No autopilot"),a(),I(20,km,3,5,"mat-option",6,oe),a()(),o(22,"div",7)(23,"b"),l(24,"Supported modes:"),a(),l(25),a(),o(26,"mat-checkbox",8),l(27," Display True Heading "),a(),o(28,"mat-checkbox",9),l(29," Invert Rudder Angle Indicator "),a()()()),t&2&&(d(),g("formGroup",i.autopilotFormGroup),d(8),B(" ",i.apiVersion()),d(4),B(" ",i.pluginId()),d(7),A(i.apInstances()),d(5),B(" ",i.modes()," "))},dependencies:[J,Q,ce,Me,U,Re,he,te,Z,je,Ae,qe,Ee,ee,Te,Wt],styles:[".autopilot-options[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:10px}"]})}return n})();var Ti=(()=>{class n{data=m(tt);destroyRef=m(be);allPaths=new Set;registrations=new Map;constructor(){this.seedFromDataCache(),this.data.observePathUpdates().pipe(q(this.destroyRef)).subscribe(e=>this.applyPathUpdate(e)),this.data.isResetService().pipe(q(this.destroyRef)).subscribe(()=>this.reset())}seedFromDataCache(){for(let e of this.data.getCachedPaths())this.addPath(e)}register(e){this.assertHasCriteria(e);let t=this.createToken(e.id),i=this.compileCriteria(e),r=new Set;for(let c of this.allPaths)this.matchesCriteria(c,i)&&r.add(c);return this.registrations.set(t,{criteria:i,matches:r,changes$:new me}),t}unregister(e){let t=this.registrations.get(e);t&&(t.changes$.complete(),this.registrations.delete(e))}changes(e){return this.registrations.get(e)?.changes$.asObservable()??ci}activePaths(e){return this.registrations.get(e)?.matches??new Set}match(e){this.assertHasCriteria(e);let t=this.compileCriteria(e);return Array.from(this.allPaths).filter(i=>this.matchesCriteria(i,t))}applyPathUpdate(e){let t=e?.fullPath;t&&(e.kind==="data"&&e.update?.value===null||this.addPath(t))}addPath(e){if(!this.allPaths.has(e)){this.allPaths.add(e);for(let t of this.registrations.values())this.matchesCriteria(e,t.criteria)&&(t.matches.add(e),t.changes$.next({type:"add",path:e}))}}removePath(e){if(this.allPaths.delete(e))for(let t of this.registrations.values())t.matches.delete(e)&&t.changes$.next({type:"remove",path:e})}reset(){for(let e of this.registrations.values()){for(let t of e.matches)e.changes$.next({type:"remove",path:t});e.matches.clear()}this.allPaths.clear()}compileCriteria(e){let t=e.patterns?.length?e.patterns:[];return W(R({},e),{patterns:t,compiled:{patterns:t.map(i=>this.globToRegex(i)),contextTypes:e.contextTypes??[],prefixGuards:e.pathPrefixes??[],suffixGuards:e.pathSuffixes??[]}})}matchesCriteria(e,t){let i=t.compiled,r=this.getContextType(e);if(i.contextTypes.length&&(!r||!i.contextTypes.includes(r)))return!1;let c=this.getPathPart(e,r);return i.prefixGuards.length&&!i.prefixGuards.some(p=>c.startsWith(p))||i.suffixGuards.length&&!this.matchesSuffix(c,i.suffixGuards)?!1:i.patterns.length?i.patterns.some(p=>p.test(e)):!0}getPathPart(e,t){if(t==="self"){let r=e.indexOf(".");return r===-1?e:e.slice(r+1)}if(t==="vessels"||t==="atons"){let r=`${t}.urn:mrn:imo:mmsi:`;if(!e.startsWith(r))return e;let c=e.indexOf(".",r.length);return c===-1?"":e.slice(c+1)}let i=e.indexOf(".");return i===-1?e:e.slice(i+1)}getContextType(e){return e.startsWith("self.")?"self":e.startsWith("vessels.urn:mrn:imo:mmsi:")?"vessels":e.startsWith("atons.urn:mrn:imo:mmsi:")?"atons":null}globToRegex(e){let i="^"+e.replace(/[-/\\^$+?.()|[\]{}]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".")+"$";return new RegExp(i)}matchesSuffix(e,t){if(!t.length)return!0;let i=e.lastIndexOf("."),r=i===-1?`.${e}`:e.slice(i);return t.some(c=>e.endsWith(c)||r===c)}createToken(e){let t=e??"token",i=`${t}-${Math.random().toString(36).slice(2,10)}`;for(;this.registrations.has(i);)i=`${t}-${Math.random().toString(36).slice(2,10)}`;return i}assertHasCriteria(e){let t=Array.isArray(e.patterns)&&e.patterns.length>0,i=Array.isArray(e.contextTypes)&&e.contextTypes.length>0,r=Array.isArray(e.pathPrefixes)&&e.pathPrefixes.length>0,c=Array.isArray(e.pathSuffixes)&&e.pathSuffixes.length>0;if(!t&&!i&&!r&&!c)throw new Error("PathDiscoveryService.register requires at least one criteria (pattern or guard).")}ngOnDestroy(){for(let e of this.registrations.values())e.changes$.complete();this.registrations.clear(),this.allPaths.clear()}static \u0275fac=function(t){return new(t||n)};static \u0275prov=xe({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})();var wm=(n,s)=>s.key;function Sm(n,s){if(n&1&&(o(0,"mat-option",4),l(1),a()),n&2){let e=s.$implicit;g("value",e),d(),v(e.id)}}function Mm(n,s){n&1&&(o(0,"div",5),l(1,"No banks configured yet."),a())}function Tm(n,s){if(n&1&&(o(0,"mat-option",4),l(1),a()),n&2){let e=s.$implicit;g("value",e),d(),v(e)}}function Em(n,s){if(n&1&&(o(0,"mat-option",4),l(1),Ce(2,"titlecase"),a()),n&2){let e=s.$implicit;g("value",e),d(),v(Le(2,2,e))}}function Im(n,s){if(n&1){let e=P();o(0,"div",9)(1,"div",10)(2,"mat-form-field",11)(3,"mat-label"),l(4,"Bank Name"),a(),b(5,"input",12),a(),o(6,"button",13),C("click",function(){let i=y(e).$index,r=u();return x(r.removeBank(i))}),o(7,"mat-icon"),l(8,"delete"),a()()(),o(9,"mat-form-field",2)(10,"mat-label"),l(11,"Battery Members"),a(),o(12,"mat-select",14),I(13,Tm,2,2,"mat-option",4,oe),a()(),o(15,"mat-form-field",2)(16,"mat-label"),l(17,"Connection Mode"),a(),o(18,"mat-select",15),I(19,Em,3,4,"mat-option",4,_e),a()()()}if(n&2){let e=s.$index,t=u();g("formGroupName",e),d(13),A(t.discoveredBatteryIds()),d(6),A(t.connectionModes)}}var nl=(()=>{class n{connectionModes=["parallel","series"];formGroupName=S.required();rootFormGroup=m(U);discovery=m(Ti);destroyRef=m(be);bmsFormGroup;groupsFormArray;trackedDevicesControl;discoveredBatteryIds=T([]);discoveredTrackedDevices=ue(()=>this.discoveredBatteryIds().map(e=>({id:e,source:"default",key:`${e}||default`})));hasGroups=ue(()=>this.groupsFormArray?.length>0);discoveryToken;ngOnInit(){this.bmsFormGroup=this.rootFormGroup.control.get(this.formGroupName()),this.bmsFormGroup&&(this.ensureTrackedControl(),this.ensureBanksArray(),this.initializeDiscovery())}addBank(){let e={id:`bank-${Date.now()}`,name:"New Bank",memberIds:[],connectionMode:"parallel"};this.groupsFormArray.push(this.createGroup(e)),this.groupsFormArray.markAsDirty()}removeBank(e){this.groupsFormArray.removeAt(e),this.groupsFormArray.markAsDirty()}ngOnDestroy(){this.discoveryToken&&this.discovery.unregister(this.discoveryToken)}ensureTrackedControl(){let e=this.bmsFormGroup.get("trackedDevices");if(e instanceof L){this.trackedDevicesControl=e,this.trackedDevicesControl.setValue(this.normalizeTrackedDeviceArray(this.trackedDevicesControl.value),{emitEvent:!1});return}this.trackedDevicesControl=new L([]),this.bmsFormGroup.addControl("trackedDevices",this.trackedDevicesControl)}compareTrackedDevice(e,t){return!e||!t?e===t:e.key===t.key}normalizeTrackedDeviceArray(e){if(!Array.isArray(e))return[];let t=new Map;return e.forEach(i=>{if(!i||typeof i!="object")return;let r=i,c=typeof r.id=="string"?r.id.trim():"",p=typeof r.source=="string"?r.source.trim():"default";if(!c||!p)return;let _=typeof r.key=="string"&&r.key.trim().length>0?r.key.trim():`${c}||${p}`;t.set(_,{id:c,source:p,key:_})}),[...t.values()].sort((i,r)=>i.key.localeCompare(r.key))}ensureBanksArray(){let e=this.bmsFormGroup.get("groups")??this.bmsFormGroup.get("banks");if(e instanceof bi||e instanceof ft){this.groupsFormArray=e,this.bmsFormGroup.get("groups")||this.bmsFormGroup.setControl("groups",this.groupsFormArray);return}let t=Array.isArray(e?.value)?e.value:[];this.groupsFormArray=new ft(t.map(i=>this.createGroup(i))),this.bmsFormGroup.setControl("groups",this.groupsFormArray)}createGroup(e){let t=Array.isArray(e.memberIds)?e.memberIds:Array.isArray(e.batteryIds)?e.batteryIds:[];return new Ve({id:new L(e.id,z.required),name:new L(e.name,z.required),memberIds:new L(t),connectionMode:new L(e.connectionMode??"parallel",z.required)})}initializeDiscovery(){this.discoveryToken=this.discovery.register({id:"bms-batteries",patterns:["self.electrical.batteries.*"],contextTypes:["self"],pathPrefixes:["electrical.batteries."]}),this.updateDiscoveredBatteryIds(),this.discovery.changes(this.discoveryToken).pipe(q(this.destroyRef)).subscribe(()=>this.updateDiscoveredBatteryIds())}updateDiscoveredBatteryIds(){if(!this.discoveryToken)return;let e=Array.from(this.discovery.activePaths(this.discoveryToken)).map(t=>this.extractBatteryId(t)).filter(t=>!!t);this.discoveredBatteryIds.set([...new Set(e)].sort())}extractBatteryId(e){let t=e.match(/self\.electrical\.batteries\.([^.]+)\./);return t?t[1]:null}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["bms-bank-setup"]],inputs:{formGroupName:[1,"formGroupName"]},decls:23,vars:3,consts:[[1,"bms-config",3,"formGroup"],[1,"bms-config-section"],["appearance","outline",1,"full-width"],["formControlName","trackedDevices","multiple","",3,"compareWith"],[3,"value"],[1,"hint"],[1,"section-header"],["mat-stroked-button","","color","primary","type","button",3,"click"],["formArrayName","groups",1,"bank-list"],[1,"bank-card",3,"formGroupName"],[1,"bank-row"],["appearance","outline",1,"bank-name"],["matInput","","formControlName","name"],["mat-icon-button","","type","button","aria-label","Remove bank",3,"click"],["formControlName","memberIds","multiple",""],["formControlName","connectionMode"]],template:function(t,i){t&1&&(o(0,"div",0)(1,"div",1)(2,"h3"),l(3,"Tracked Batteries"),a(),o(4,"mat-form-field",2)(5,"mat-label"),l(6,"Battery Instances"),a(),o(7,"mat-select",3),I(8,Sm,2,2,"mat-option",4,wm),a()(),o(10,"div",5),l(11," Leave empty to display all discovered batteries. "),a()(),b(12,"mat-divider"),o(13,"div",1)(14,"div",6)(15,"h3"),l(16,"Battery Banks"),a(),o(17,"button",7),C("click",function(){return i.addBank()}),l(18," Add Bank "),a()(),o(19,"div",8),h(20,Mm,2,0,"div",5),I(21,Im,21,1,"div",9,oe),a()()()),t&2&&(g("formGroup",i.bmsFormGroup),d(7),g("compareWith",i.compareTrackedDevice),d(),A(i.discoveredTrackedDevices()),d(12),f(i.hasGroups()?-1:20),d(),A(i.groupsFormArray.controls))},dependencies:[J,fe,Q,ce,U,Re,Kt,vi,he,te,Z,Te,ge,qe,Ee,ee,se,Se,le,de,K,ct,et,Wt],styles:["[_nghost-%COMP%]{display:block;width:100%}.bms-config[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:16px;padding:12px 4px}.bms-config-section[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:12px}.section-header[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:space-between;gap:12px}.full-width[_ngcontent-%COMP%]{width:100%}.bank-list[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:12px}.bank-card[_ngcontent-%COMP%]{border:1px solid var(--skip-widget-card-border-color);border-radius:12px;padding:12px;background:var(--skip-contrast-dimmer-color);display:flex;flex-direction:column;gap:10px}.bank-row[_ngcontent-%COMP%]{display:flex;align-items:center;gap:12px}.bank-name[_ngcontent-%COMP%]{flex:1}.hint[_ngcontent-%COMP%]{font-size:12px;opacity:.7}"]})}return n})();function Am(n,s){if(n&1){let e=P();o(0,"mat-checkbox",8),C("change",function(){let i=y(e).$implicit,r=u(2);return x(r.toggleVesselType(i))}),l(1),a()}if(n&2){let e=s.$implicit,t=u(2);g("checked",t.isVesselTypeSelected(e)),d(),B(" ",t.formatVesselTypeLabel(e)," ")}}function Dm(n,s){if(n&1&&(o(0,"div",0)(1,"p",1),l(2,"Categories"),a(),o(3,"mat-checkbox",2),l(4,"Anchored/Moored"),a(),o(5,"mat-checkbox",3),l(6,"All AtoN"),a(),o(7,"mat-checkbox",4),l(8,"All but SAR"),a(),o(9,"mat-checkbox",5),l(10,"All Vessels"),a(),b(11,"mat-divider",6),o(12,"p",1),l(13,"Types of vessels"),a(),I(14,Am,2,2,"mat-checkbox",7,_e),a()),n&2){let e=u();g("formGroup",e.filtersGroup),d(14),A(e.vesselTypeFilters)}}var al=(()=>{class n{formGroupName=S.required();rootFormGroup=m(U);fb=m(Yt);aisFormGroup=null;filtersGroup=null;vesselTypeFilters=kr.filter(e=>e!=="vessel/self"&&e!=="vessel/unknown"&&e!=="vessel/spare");ngOnInit(){if(this.aisFormGroup=this.rootFormGroup.control.get(this.formGroupName()),!this.aisFormGroup){console.warn(`AIS form group "${this.formGroupName()}" not found for target options.`);return}this.filtersGroup=this.ensureFiltersGroup(this.aisFormGroup)}isVesselTypeSelected(e){let t=this.vesselTypesControl();if(!t)return!1;let i=t.value;return Array.isArray(i)&&i.includes(e)}toggleVesselType(e){let t=this.vesselTypesControl();if(!t)return;let i=Array.isArray(t.value)?t.value:[],r=new Set(i);r.has(e)?r.delete(e):r.add(e),t.setValue(Array.from(r))}formatVesselTypeLabel(e){let t=e.replace("vessel/","");switch(t){case"pleasurecraft":return"Pleasure Craft";case"highspeed":return"High Speed";case"sar":return"SAR";case"law":return"Law Enforcement";default:return`${t.charAt(0).toUpperCase()}${t.slice(1)}`}}ensureFiltersGroup(e){let t=e.get("filters");if(!t)return t=this.buildDefaultFiltersGroup(),e.addControl("filters",t),t;this.ensureControl(t,"anchoredMoored",!1),this.ensureControl(t,"noCollisionRisk",!1),this.ensureControl(t,"allAton",!1),this.ensureControl(t,"allButSar",!1),this.ensureControl(t,"allVessels",!1);let i=this.ensureControl(t,"vesselTypes",[]);return Array.isArray(i.value)||i.setValue([]),t}buildDefaultFiltersGroup(){return this.fb.group({anchoredMoored:new L(!1),noCollisionRisk:new L(!1),allAton:new L(!1),allButSar:new L(!1),allVessels:new L(!1),vesselTypes:new L([])})}ensureControl(e,t,i){let r=e.get(t);return r||(r=new L(i),e.addControl(t,r)),r}vesselTypesControl(){return this.filtersGroup?.get("vesselTypes")}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["ais-target-options"]],inputs:{formGroupName:[1,"formGroupName"]},decls:1,vars:1,consts:[[1,"vessel-type-grid",3,"formGroup"],[1,"span-all"],["formControlName","anchoredMoored"],["formControlName","allAton"],["formControlName","allButSar"],["formControlName","allVessels"],[1,"span-all","ais-target-divider"],[3,"checked"],[3,"change","checked"]],template:function(t,i){t&1&&h(0,Dm,16,1,"div",0),t&2&&f(i.filtersGroup?0:-1)},dependencies:[J,Q,ce,U,Re,je,Ae,ct,et],styles:["[_nghost-%COMP%]{display:block;height:100%;width:100%;overflow:hidden}.ais-target-options[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:16px}.vessel-type-grid[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0px 12px}.span-all[_ngcontent-%COMP%]{grid-column:1/-1}.ais-target-divider[_ngcontent-%COMP%]{margin:4px 0}"],changeDetection:0})}return n})();var Pm=(n,s)=>s.key;function Om(n,s){if(n&1&&(o(0,"mat-option",4),l(1),a()),n&2){let e=s.$implicit;g("value",e),d(),We("",e.id," (",e.source,")")}}function Fm(n,s){n&1&&(o(0,"div",5),l(1,"No chargers discovered yet."),a())}function Rm(n,s){if(n&1&&(o(0,"div",8)(1,"div",9),l(2),a(),o(3,"mat-form-field",2)(4,"mat-label"),l(5,"Array Rated Power (W)"),a(),b(6,"input",10),a()()),n&2){let e=s.$implicit;g("formGroupName",e),d(2),v(e)}}function Nm(n,s){n&1&&(o(0,"div",5),l(1,"No groups configured yet."),a())}function Lm(n,s){if(n&1&&(o(0,"mat-option",4),l(1),a()),n&2){let e=s.$implicit;g("value",e),d(),v(e)}}function Vm(n,s){if(n&1&&(o(0,"mat-option",4),l(1),Ce(2,"titlecase"),a()),n&2){let e=s.$implicit;g("value",e),d(),v(Le(2,2,e))}}function Gm(n,s){if(n&1){let e=P();o(0,"div",14)(1,"div",15)(2,"mat-form-field",16)(3,"mat-label"),l(4,"Group Name"),a(),b(5,"input",17),a(),o(6,"button",18),C("click",function(){let i=y(e).$index,r=u(2);return x(r.removeGroup(i))}),o(7,"mat-icon"),l(8,"delete"),a()()(),o(9,"mat-form-field",2)(10,"mat-label"),l(11,"Group Members"),a(),o(12,"mat-select",19),I(13,Lm,2,2,"mat-option",4,_e),a()(),o(15,"mat-form-field",2)(16,"mat-label"),l(17,"Connection Mode"),a(),o(18,"mat-select",20),I(19,Vm,3,4,"mat-option",4,_e),a()()()}if(n&2){let e=s.$index,t=u(2);g("formGroupName",e),d(13),A(t.discoveredSolarIds()),d(6),A(t.connectionModes)}}function Bm(n,s){if(n&1){let e=P();b(0,"mat-divider"),o(1,"div",1)(2,"div",11)(3,"h3"),l(4,"Charger Groups"),a(),o(5,"button",12),C("click",function(){y(e);let i=u();return x(i.addGroup())}),l(6," Add Group "),a()(),o(7,"div",13),h(8,Nm,2,0,"div",5),I(9,Gm,21,1,"div",14,oe),a()()}if(n&2){let e=u();d(8),f(e.hasGroups()?-1:8),d(),A(e.groupsFormArray.controls)}}var ol=(()=>{class n{connectionModes=["parallel","series"];formGroupName=S.required();rootFormGroup=m(U);discovery=m(Ti);data=m(tt);destroyRef=m(be);solarFormGroup;trackedDevicesControl;groupsFormArray;optionsByIdGroup;discoveredSolarIds=T([]);discoveredTrackedDevices=T([]);selectedTrackedDeviceIds=T([]);hasGroups=ue(()=>(this.groupsFormArray?.length??0)>0);supportsGroups=ue(()=>!!this.groupsFormArray);optionIds=ue(()=>{let e=this.selectedTrackedDeviceIds(),t=this.discoveredSolarIds(),i=Object.keys(this.optionsByIdGroup?.controls??{});return e.length?[...new Set([...e,...i.filter(r=>e.includes(r))])].sort():[...new Set([...i,...t])].sort()});discoveryToken;ngOnInit(){this.solarFormGroup=this.rootFormGroup.control.get(this.formGroupName()),this.solarFormGroup&&(this.ensureOptionsGroup(),this.ensureTrackedControl(),this.ensureGroupsArray(),this.initializeDiscovery())}ngOnDestroy(){this.discoveryToken&&this.discovery.unregister(this.discoveryToken)}ensureSolarOption(e){this.optionsByIdGroup.get(e)||this.optionsByIdGroup.addControl(e,this.createOptionGroup({arrayRatedPowerW:null}))}compareTrackedDevice(e,t){return!e||!t?e===t:e.key===t.key}ensureTrackedControl(){let e=this.solarFormGroup.get("trackedDevices");if(e instanceof L){this.trackedDevicesControl=e,this.trackedDevicesControl.setValue(this.normalizeTrackedDeviceArray(this.trackedDevicesControl.value),{emitEvent:!1}),this.syncSelectedTrackedDeviceIds(this.trackedDevicesControl.value),this.trackedDevicesControl.valueChanges.pipe(q(this.destroyRef)).subscribe(t=>this.syncSelectedTrackedDeviceIds(t));return}this.trackedDevicesControl=new L([]),this.solarFormGroup.addControl("trackedDevices",this.trackedDevicesControl),this.syncSelectedTrackedDeviceIds(this.trackedDevicesControl.value),this.trackedDevicesControl.valueChanges.pipe(q(this.destroyRef)).subscribe(t=>this.syncSelectedTrackedDeviceIds(t))}ensureGroupsArray(){let e=this.solarFormGroup.get("groups")??this.solarFormGroup.get("banks");if(!e)return;if(e instanceof bi||e instanceof ft){this.groupsFormArray=e,this.solarFormGroup.get("groups")||this.solarFormGroup.setControl("groups",this.groupsFormArray);return}let t=Array.isArray(e?.value)?e.value:[];this.groupsFormArray=new ft(t.map(i=>this.createGroup(i))),this.solarFormGroup.setControl("groups",this.groupsFormArray)}ensureOptionsGroup(){let e=this.solarFormGroup.get("optionsById");if(e instanceof Ve){this.optionsByIdGroup=e,this.syncOptionControlStates();return}this.optionsByIdGroup=new Ve({}),this.solarFormGroup.addControl("optionsById",this.optionsByIdGroup),this.syncOptionControlStates()}addGroup(){let e=this.groupsFormArray;if(!e)return;let t={id:`solar-bank-${Date.now()}`,name:"New Group",memberIds:[],connectionMode:"parallel"};e.push(this.createGroup(t)),e.markAsDirty()}removeGroup(e){let t=this.groupsFormArray;t&&(t.removeAt(e),t.markAsDirty())}createGroup(e){return new Ve({id:new L(e.id,z.required),name:new L(e.name,z.required),memberIds:new L(e.memberIds??[]),connectionMode:new L(e.connectionMode??"parallel",z.required)})}createOptionGroup(e){return new Ve({arrayRatedPowerW:new L(e.arrayRatedPowerW)})}initializeDiscovery(){this.discoveryToken=this.discovery.register({id:"solar-chargers",patterns:["self.electrical.solar.*"],contextTypes:["self"],pathPrefixes:["electrical.solar."]}),this.updateDiscoveredSolarIds(),this.discovery.changes(this.discoveryToken).pipe(q(this.destroyRef)).subscribe(()=>this.updateDiscoveredSolarIds())}updateDiscoveredSolarIds(){if(!this.discoveryToken)return;let e=new Set([...Array.from(this.discovery.activePaths(this.discoveryToken)),...this.data.getCachedPaths(!0)]),t=Array.from(e).map(p=>this.extractSolarId(p)).filter(p=>!!p),i=[...new Set(t)].sort(),r=new Map;Array.from(e).forEach(p=>{let _=this.extractSolarId(p);if(!_)return;let k=this.data.getPathObject(p),w=Object.keys(k?.sources??{});r.has(_)||r.set(_,new Set);let M=r.get(_);M&&w.forEach(ie=>{let ne=ie.trim();ne&&M.add(ne)})});let c=new Map;i.forEach(p=>{let _=r.get(p);(_&&_.size>0?[..._].sort((w,M)=>w.localeCompare(M)):["default"]).forEach(w=>{let M=`${p}||${w}`;c.set(M,{id:p,source:w,key:M})})});for(let p of i)this.ensureSolarOption(p);this.discoveredSolarIds.set(i),this.discoveredTrackedDevices.set([...c.values()].sort((p,_)=>p.key.localeCompare(_.key))),this.syncOptionControlStates()}syncSelectedTrackedDeviceIds(e){let t=[...new Set(this.normalizeTrackedDeviceArray(e).map(i=>i.id))].sort();t.forEach(i=>this.ensureSolarOption(i)),this.selectedTrackedDeviceIds.set(t),this.syncOptionControlStates()}syncOptionControlStates(){if(!this.optionsByIdGroup)return;let e=new Set(this.optionIds());Object.entries(this.optionsByIdGroup.controls).forEach(([t,i])=>{let r=i.get("arrayRatedPowerW");r instanceof L&&(e.has(t)?(r.setValidators([z.required,z.min(0)]),r.enable({emitEvent:!1})):(r.clearValidators(),r.disable({emitEvent:!1})),r.updateValueAndValidity({emitEvent:!1}))}),this.optionsByIdGroup.updateValueAndValidity({emitEvent:!1}),this.solarFormGroup.updateValueAndValidity({emitEvent:!1})}extractSolarId(e){let t=e.match(/^self\.electrical\.solar\.([^.]+)(?:\.|$)/);return t?t[1]:null}normalizeTrackedDeviceArray(e){if(!Array.isArray(e))return[];let t=new Map;return e.forEach(i=>{if(typeof i=="string"){let k=i.trim();if(!k)return;let w=`${k}||default`;t.set(w,{id:k,source:"default",key:w});return}if(!i||typeof i!="object")return;let r=i,c=typeof r.id=="string"?r.id.trim():"",p=typeof r.source=="string"?r.source.trim():"default";if(!c||!p)return;let _=typeof r.key=="string"&&r.key.trim().length>0?r.key.trim():`${c}||${p}`;t.set(_,{id:c,source:p,key:_})}),[...t.values()].sort((i,r)=>i.key.localeCompare(r.key))}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["solar-charger-setup"]],inputs:{formGroupName:[1,"formGroupName"]},decls:23,vars:4,consts:[[1,"solar-config",3,"formGroup"],[1,"solar-config-section"],["appearance","outline",1,"full-width"],["formControlName","trackedDevices","multiple","",3,"compareWith"],[3,"value"],[1,"hint"],["formGroupName","optionsById",1,"solar-config-section"],[1,"option-list"],[1,"option-card",3,"formGroupName"],[1,"option-title"],["matInput","","type","number","required","","min","0","formControlName","arrayRatedPowerW","placeholder","e.g. 800"],[1,"section-header"],["mat-stroked-button","","type","button",3,"click"],["formArrayName","groups",1,"bank-list"],[1,"bank-card",3,"formGroupName"],[1,"bank-row"],["appearance","outline",1,"bank-name"],["matInput","","formControlName","name"],["mat-icon-button","","type","button","aria-label","Remove group",3,"click"],["formControlName","memberIds","multiple",""],["formControlName","connectionMode"]],template:function(t,i){t&1&&(o(0,"div",0)(1,"div",1)(2,"h3"),l(3,"Tracked Solar Chargers"),a(),o(4,"mat-form-field",2)(5,"mat-label"),l(6,"Charger Instances"),a(),o(7,"mat-select",3),I(8,Om,2,3,"mat-option",4,Pm),a()(),o(10,"div",5),l(11,"Leave empty to display all discovered chargers."),a()(),b(12,"mat-divider"),o(13,"div",6)(14,"h3"),l(15,"Solar Array Rated Power"),a(),o(16,"div",5),l(17,"Set each charger's panel/array rated capacity in watts (W)."),a(),o(18,"div",7),h(19,Fm,2,0,"div",5),I(20,Rm,7,2,"div",8,_e),a()(),h(22,Bm,11,1),a()),t&2&&(g("formGroup",i.solarFormGroup),d(7),g("compareWith",i.compareTrackedDevice),d(),A(i.discoveredTrackedDevices()),d(11),f(i.optionIds().length?-1:19),d(),A(i.optionIds()),d(2),f(i.supportsGroups()?22:-1))},dependencies:[J,fe,wt,Q,ce,Me,Qt,U,Re,Kt,vi,he,te,Z,Te,ge,qe,Ee,ee,ct,et,se,Se,le,de,K,Wt],styles:["[_nghost-%COMP%]{display:block;width:100%}.solar-config[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:16px;padding:12px 4px}.solar-config-section[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:12px}.full-width[_ngcontent-%COMP%]{width:100%}.option-list[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:12px}.option-card[_ngcontent-%COMP%]{border:1px solid var(--skip-widget-card-border-color);border-radius:12px;padding:12px;background:var(--skip-contrast-dimmer-color);display:flex;flex-direction:column;gap:10px}.option-title[_ngcontent-%COMP%]{font-weight:600;font-size:14px}.hint[_ngcontent-%COMP%]{font-size:12px;opacity:.7}"]})}return n})();var zm=(n,s)=>s.key,Um=(n,s)=>s.value;function Wm(n,s){if(n&1&&(o(0,"mat-option",3),l(1),a()),n&2){let e=s.$implicit,t=u();g("value",e),d(),v(t.isSourceAwareFamily()?e.id+" ("+e.source+")":e.id)}}function $m(n,s){n&1&&(o(0,"div",4),l(1,"No groups configured."),a())}function qm(n,s){if(n&1&&(o(0,"mat-option",3),l(1),a()),n&2){let e=s.$implicit;g("value",e),d(),v(e)}}function Hm(n,s){if(n&1&&(o(0,"mat-option",3),l(1),a()),n&2){let e=s.$implicit;g("value",e.value),d(),v(e.label)}}function jm(n,s){if(n&1){let e=P();o(0,"div",7)(1,"div",8)(2,"mat-form-field")(3,"mat-label"),l(4,"Group id"),a(),b(5,"input",9),a(),o(6,"mat-form-field")(7,"mat-label"),l(8,"Name"),a(),b(9,"input",10),a(),o(10,"mat-form-field")(11,"mat-label"),l(12,"Connection"),a(),o(13,"mat-select",11),I(14,qm,2,2,"mat-option",3,_e),a()(),o(16,"button",12),C("click",function(){let i=y(e).$index,r=u(2);return x(r.removeGroup(i))}),o(17,"mat-icon"),l(18,"delete"),a()()(),o(19,"mat-form-field",1)(20,"mat-label"),l(21,"Members"),a(),o(22,"mat-select",13),I(23,Hm,2,2,"mat-option",3,Um),a()()()}if(n&2){let e=s.$implicit,t=u(2);g("formGroup",e),d(14),A(t.connectionModes),d(9),A(t.memberOptions())}}function Km(n,s){if(n&1){let e=P();b(0,"mat-divider",1),o(1,"div",5)(2,"h3"),l(3),a(),o(4,"button",6),C("click",function(){y(e);let i=u();return x(i.addGroup())}),o(5,"mat-icon"),l(6,"add"),a(),l(7," Add group "),a()(),h(8,$m,2,0,"div",4),I(9,jm,25,1,"div",7,oe)}if(n&2){let e=u();d(3),B("",e.setupLabel()," Groups"),d(5),f(e.hasGroups()?-1:8),d(),A(e.groupsFormArray.controls)}}var zn=class n{connectionModes=["parallel","series"];formGroupName=S.required();setupLabel=S.required();discoveryId=S.required();discoveryPattern=S.required();familyRegex=S.required();pathPrefix=S.required();rootFormGroup=m(U);discovery=m(Ti);data=m(tt);destroyRef=m(be);static SOURCE_AWARE_FAMILIES=new Set(["charger","inverter","alternator","ac"]);familyFormGroup;trackedDevicesControl;groupsFormArray;discoveredIds=T([]);discoveredTrackedDevices=T([]);isSourceAwareFamily=ue(()=>n.SOURCE_AWARE_FAMILIES.has(this.formGroupName().trim()));memberOptions=ue(()=>this.isSourceAwareFamily()?this.discoveredTrackedDevices().map(s=>({value:s.key,label:`${s.id} (${s.source})`})):this.discoveredIds().map(s=>({value:s,label:s})));hasGroups=ue(()=>(this.groupsFormArray?.length??0)>0);supportsGroups=ue(()=>!!this.groupsFormArray);discoveryToken;static FAMILY_CRITERIA={charger:{patterns:["self.electrical.charger*"],pathPrefixes:["electrical.charger"],idRegex:/self\.electrical\.chargers?\.([^.]+)(?:\.|$)/},inverter:{patterns:["self.electrical.inverter*"],pathPrefixes:["electrical.inverter"],idRegex:/self\.electrical\.inverters?\.([^.]+)(?:\.|$)/},alternator:{patterns:["self.electrical.alternator*"],pathPrefixes:["electrical.alternator"],idRegex:/self\.electrical\.alternators?\.([^.]+)(?:\.|$)/},ac:{patterns:["self.electrical.ac*"],pathPrefixes:["electrical.ac."],idRegex:/self\.electrical\.ac\.([^.]+)(?:\.|$)/}};ngOnInit(){this.familyFormGroup=this.rootFormGroup.control.get(this.formGroupName()),this.familyFormGroup&&(this.ensureTrackedControl(),this.ensureGroupsArray(),this.initializeDiscovery())}ngOnDestroy(){this.discoveryToken&&this.discovery.unregister(this.discoveryToken)}addGroup(){let s=this.groupsFormArray;if(!s)return;let t={id:`${this.setupLabel().toLowerCase().replace(/\s+/g,"-")}-group-${Date.now()}`,name:`${this.setupLabel()} Group`,memberIds:[],connectionMode:"parallel"};s.push(this.createGroup(t)),s.markAsDirty()}removeGroup(s){let e=this.groupsFormArray;e&&(e.removeAt(s),e.markAsDirty())}compareTrackedDevice(s,e){return!s&&!e?!0:!s||!e?!1:s.key===e.key}ensureTrackedControl(){let s=this.familyFormGroup.get("trackedDevices");if(s instanceof L){this.trackedDevicesControl=s,this.trackedDevicesControl.setValue(this.normalizeTrackedDeviceArray(this.trackedDevicesControl.value),{emitEvent:!1});return}this.trackedDevicesControl=new L([]),this.familyFormGroup.addControl("trackedDevices",this.trackedDevicesControl),this.trackedDevicesControl.setValue(this.normalizeTrackedDeviceArray(this.trackedDevicesControl.value),{emitEvent:!1})}ensureGroupsArray(){let s=this.familyFormGroup.get("groups")??this.familyFormGroup.get("banks");if(!s)return;if(s instanceof bi||s instanceof ft){this.groupsFormArray=s,this.familyFormGroup.get("groups")||this.familyFormGroup.setControl("groups",this.groupsFormArray);return}let e=Array.isArray(s?.value)?s.value:[];this.groupsFormArray=new ft(e.map(t=>this.createGroup(t))),this.familyFormGroup.setControl("groups",this.groupsFormArray)}createGroup(s){return new Ve({id:new L(s.id,z.required),name:new L(s.name,z.required),memberIds:new L(s.memberIds??[]),connectionMode:new L(s.connectionMode??"parallel",z.required)})}initializeDiscovery(){let s=this.resolveCriteria();this.discoveryToken=this.discovery.register({id:this.discoveryId(),patterns:s.patterns,contextTypes:["self"],pathPrefixes:s.pathPrefixes}),this.updateDiscoveredIds(),this.discovery.changes(this.discoveryToken).pipe(q(this.destroyRef)).subscribe(()=>this.updateDiscoveredIds()),this.isSourceAwareFamily()&&this.data.observePathUpdates().pipe(q(this.destroyRef)).subscribe(e=>{e.kind!=="data"||!this.matchesDiscoveryPath(e.fullPath)||this.updateDiscoveredIds()})}matchesDiscoveryPath(s){return s?this.resolveCriteria().idRegex.test(s):!1}updateDiscoveredIds(){if(!this.discoveryToken)return;let s=this.resolveCriteria().idRegex,e=new Set([...Array.from(this.discovery.activePaths(this.discoveryToken)),...this.data.getCachedPaths(!0)]),t=new Set,i=new Map;Array.from(e).forEach(c=>{let p=s.exec(c),_=p?p[1]:null;if(!_)return;t.add(_),i.has(_)||i.set(_,new Set);let k=this.data.getPathObject(c),w=Object.keys(k?.sources??{}),M=i.get(_);M&&w.forEach(ie=>{let ne=ie.trim();ne&&M.add(ne)})});let r=[...t].sort((c,p)=>c.localeCompare(p));if(this.discoveredIds.set(r),this.isSourceAwareFamily()){let c=new Map;r.forEach(p=>{let _=i.get(p);(_&&_.size>0?[..._].sort((w,M)=>w.localeCompare(M)):["default"]).forEach(w=>{let M=`${p}||${w}`;c.set(M,{id:p,source:w,key:M})})}),this.discoveredTrackedDevices.set([...c.values()].sort((p,_)=>p.key.localeCompare(_.key)));return}this.discoveredTrackedDevices.set(r.map(c=>({id:c,source:"default",key:`${c}||default`})).sort((c,p)=>c.key.localeCompare(p.key)))}normalizeTrackedDeviceArray(s){if(!Array.isArray(s))return[];let e=new Map;return s.forEach(t=>{if(typeof t=="string"){let _=t.trim();if(!_)return;let k=`${_}||default`;e.set(k,{id:_,source:"default",key:k});return}if(!t||typeof t!="object")return;let i=t,r=typeof i.id=="string"?i.id.trim():"",c=typeof i.source=="string"?i.source.trim():"default";if(!r||!c)return;let p=typeof i.key=="string"&&i.key.trim().length>0?i.key.trim():`${r}||${c}`;e.set(p,{id:r,source:c,key:p})}),[...e.values()].sort((t,i)=>t.key.localeCompare(i.key))}resolveCriteria(){let s=this.formGroupName().trim(),e=n.FAMILY_CRITERIA[s];return e||{patterns:[this.discoveryPattern()],pathPrefixes:[this.pathPrefix()],idRegex:new RegExp(this.familyRegex())}}static \u0275fac=function(e){return new(e||n)};static \u0275cmp=E({type:n,selectors:[["electrical-family-setup"]],inputs:{formGroupName:[1,"formGroupName"],setupLabel:[1,"setupLabel"],discoveryId:[1,"discoveryId"],discoveryPattern:[1,"discoveryPattern"],familyRegex:[1,"familyRegex"],pathPrefix:[1,"pathPrefix"]},decls:12,vars:6,consts:[[1,"family-setup-grid"],[1,"span-2"],["multiple","",3,"formControl","compareWith"],[3,"value"],[1,"hint","span-2"],[1,"groups-header","span-2"],["mat-stroked-button","","type","button",3,"click"],[1,"group-card","span-2",3,"formGroup"],[1,"group-grid"],["matInput","","formControlName","id"],["matInput","","formControlName","name"],["formControlName","connectionMode"],["mat-icon-button","","type","button","color","warn","aria-label","Remove group",3,"click"],["formControlName","memberIds","multiple",""]],template:function(e,t){e&1&&(o(0,"div",0)(1,"h3"),l(2),a(),o(3,"mat-form-field",1)(4,"mat-label"),l(5),a(),o(6,"mat-select",2),I(7,Wm,2,2,"mat-option",3,zm),a()(),o(9,"div",4),l(10),a(),h(11,Km,11,2),a()),e&2&&(d(2),B("Tracked ",t.setupLabel()),d(3),B("",t.setupLabel()," Instances"),d(),g("formControl",t.trackedDevicesControl)("compareWith",t.compareTrackedDevice),d(),A(t.discoveredTrackedDevices()),d(3),B(" Leave empty to display all discovered ",t.setupLabel().toLowerCase(),". "),d(),f(t.supportsGroups()?11:-1))},dependencies:[J,fe,Q,ce,Je,U,Re,he,te,Z,Te,ge,qe,Ee,ee,ct,et,se,Se,le,de,K],styles:["[_nghost-%COMP%]{display:block;width:100%}.family-setup-grid[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:12px 4px}.span-2[_ngcontent-%COMP%]{grid-column:span 2}.hint[_ngcontent-%COMP%]{color:var(--skip-contrast-dim-color);font-size:.8rem}.groups-header[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:space-between}.groups-header[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%]{margin:0;color:var(--skip-contrast-color);font-size:.95rem}.group-card[_ngcontent-%COMP%]{border:1px solid var(--skip-widget-card-border-color);border-radius:8px;padding:10px;background:var(--skip-widget-card-background-color)}.group-grid[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:8px}"]})};var Qm=["switch"],Ym=["*"];function Zm(n,s){n&1&&(o(0,"span",11),mi(),o(1,"svg",13),b(2,"path",14),a(),o(3,"svg",15),b(4,"path",16),a()())}var Xm=new H("mat-slide-toggle-default-options",{providedIn:"root",factory:()=>({disableToggleValue:!1,hideIcon:!1,disabledInteractive:!1})}),Un=class{source;checked;constructor(s,e){this.source=s,this.checked=e}},wa=(()=>{class n{_elementRef=m(X);_focusMonitor=m(Vi);_changeDetectorRef=m(Oe);defaults=m(Xm);_onChange=e=>{};_onTouched=()=>{};_validatorOnChange=()=>{};_uniqueId;_checked=!1;_createChangeEvent(e){return new Un(this,e)}_labelId;get buttonId(){return`${this.id||this._uniqueId}-button`}_switchElement;focus(){this._switchElement.nativeElement.focus()}_noopAnimations=Ie();_focused=!1;name=null;id;labelPosition="after";ariaLabel=null;ariaLabelledby=null;ariaDescribedby;required=!1;color;disabled=!1;disableRipple=!1;tabIndex=0;get checked(){return this._checked}set checked(e){this._checked=e,this._changeDetectorRef.markForCheck()}hideIcon;disabledInteractive;change=new j;toggleChange=new j;get inputId(){return`${this.id||this._uniqueId}-input`}constructor(){m(st).load($t);let e=m(new At("tabindex"),{optional:!0}),t=this.defaults;this.tabIndex=e==null?0:parseInt(e)||0,this.color=t.color||"accent",this.id=this._uniqueId=m(ye).getId("mat-mdc-slide-toggle-"),this.hideIcon=t.hideIcon??!1,this.disabledInteractive=t.disabledInteractive??!1,this._labelId=this._uniqueId+"-label"}ngAfterContentInit(){this._focusMonitor.monitor(this._elementRef,!0).subscribe(e=>{e==="keyboard"||e==="program"?(this._focused=!0,this._changeDetectorRef.markForCheck()):e||Promise.resolve().then(()=>{this._focused=!1,this._onTouched(),this._changeDetectorRef.markForCheck()})})}ngOnChanges(e){e.required&&this._validatorOnChange()}ngOnDestroy(){this._focusMonitor.stopMonitoring(this._elementRef)}writeValue(e){this.checked=!!e}registerOnChange(e){this._onChange=e}registerOnTouched(e){this._onTouched=e}validate(e){return this.required&&e.value!==!0?{required:!0}:null}registerOnValidatorChange(e){this._validatorOnChange=e}setDisabledState(e){this.disabled=e,this._changeDetectorRef.markForCheck()}toggle(){this.checked=!this.checked,this._onChange(this.checked)}_emitChangeEvent(){this._onChange(this.checked),this.change.emit(this._createChangeEvent(this.checked))}_handleClick(){this.disabled||(this.toggleChange.emit(),this.defaults.disableToggleValue||(this.checked=!this.checked,this._onChange(this.checked),this.change.emit(new Un(this,this.checked))))}_getAriaLabelledBy(){return this.ariaLabelledby?this.ariaLabelledby:this.ariaLabel?null:this._labelId}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["mat-slide-toggle"]],viewQuery:function(t,i){if(t&1&&Pe(Qm,5),t&2){let r;O(r=F())&&(i._switchElement=r.first)}},hostAttrs:[1,"mat-mdc-slide-toggle"],hostVars:13,hostBindings:function(t,i){t&2&&(ut("id",i.id),$("tabindex",null)("aria-label",null)("name",null)("aria-labelledby",null),Ue(i.color?"mat-"+i.color:""),G("mat-mdc-slide-toggle-focused",i._focused)("mat-mdc-slide-toggle-checked",i.checked)("_mat-animation-noopable",i._noopAnimations))},inputs:{name:"name",id:"id",labelPosition:"labelPosition",ariaLabel:[0,"aria-label","ariaLabel"],ariaLabelledby:[0,"aria-labelledby","ariaLabelledby"],ariaDescribedby:[0,"aria-describedby","ariaDescribedby"],required:[2,"required","required",D],color:"color",disabled:[2,"disabled","disabled",D],disableRipple:[2,"disableRipple","disableRipple",D],tabIndex:[2,"tabIndex","tabIndex",e=>e==null?0:Ze(e)],checked:[2,"checked","checked",D],hideIcon:[2,"hideIcon","hideIcon",D],disabledInteractive:[2,"disabledInteractive","disabledInteractive",D]},outputs:{change:"change",toggleChange:"toggleChange"},exportAs:["matSlideToggle"],features:[ve([{provide:Ht,useExisting:Vt(()=>n),multi:!0},{provide:mn,useExisting:n,multi:!0}]),Ge],ngContentSelectors:Ym,decls:14,vars:27,consts:[["switch",""],["mat-internal-form-field","",3,"labelPosition"],["role","switch","type","button",1,"mdc-switch",3,"click","tabIndex","disabled"],[1,"mat-mdc-slide-toggle-touch-target"],[1,"mdc-switch__track"],[1,"mdc-switch__handle-track"],[1,"mdc-switch__handle"],[1,"mdc-switch__shadow"],[1,"mdc-elevation-overlay"],[1,"mdc-switch__ripple"],["mat-ripple","",1,"mat-mdc-slide-toggle-ripple","mat-focus-indicator",3,"matRippleTrigger","matRippleDisabled","matRippleCentered"],[1,"mdc-switch__icons"],[1,"mdc-label",3,"click","for"],["viewBox","0 0 24 24","aria-hidden","true",1,"mdc-switch__icon","mdc-switch__icon--on"],["d","M19.69,5.23L8.96,15.96l-4.23-4.23L2.96,13.5l6,6L21.46,7L19.69,5.23z"],["viewBox","0 0 24 24","aria-hidden","true",1,"mdc-switch__icon","mdc-switch__icon--off"],["d","M20 13H4v-2h16v2z"]],template:function(t,i){if(t&1&&(Ne(),o(0,"div",1)(1,"button",2,0),C("click",function(){return i._handleClick()}),b(3,"div",3)(4,"span",4),o(5,"span",5)(6,"span",6)(7,"span",7),b(8,"span",8),a(),o(9,"span",9),b(10,"span",10),a(),h(11,Zm,5,0,"span",11),a()()(),o(12,"label",12),C("click",function(c){return c.stopPropagation()}),re(13),a()()),t&2){let r=Y(2);g("labelPosition",i.labelPosition),d(),G("mdc-switch--selected",i.checked)("mdc-switch--unselected",!i.checked)("mdc-switch--checked",i.checked)("mdc-switch--disabled",i.disabled)("mat-mdc-slide-toggle-disabled-interactive",i.disabledInteractive),g("tabIndex",i.disabled&&!i.disabledInteractive?-1:i.tabIndex)("disabled",i.disabled&&!i.disabledInteractive),$("id",i.buttonId)("name",i.name)("aria-label",i.ariaLabel)("aria-labelledby",i._getAriaLabelledBy())("aria-describedby",i.ariaDescribedby)("aria-required",i.required||null)("aria-checked",i.checked)("aria-disabled",i.disabled&&i.disabledInteractive?"true":null),d(9),g("matRippleTrigger",r)("matRippleDisabled",i.disableRipple||i.disabled)("matRippleCentered",!0),d(),f(i.hideIcon?-1:11),d(),g("for",i.buttonId),$("id",i._labelId)}},dependencies:[Pt,yi],styles:[`.mdc-switch {
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  flex-shrink: 0;
  margin: 0;
  outline: none;
  overflow: visible;
  padding: 0;
  position: relative;
  width: var(--mat-slide-toggle-track-width, 52px);
}
.mdc-switch.mdc-switch--disabled {
  cursor: default;
  pointer-events: none;
}
.mdc-switch.mat-mdc-slide-toggle-disabled-interactive {
  pointer-events: auto;
}

.mdc-switch__track {
  overflow: hidden;
  position: relative;
  width: 100%;
  height: var(--mat-slide-toggle-track-height, 32px);
  border-radius: var(--mat-slide-toggle-track-shape, var(--mat-sys-corner-full));
}
.mdc-switch--disabled.mdc-switch .mdc-switch__track {
  opacity: var(--mat-slide-toggle-disabled-track-opacity, 0.12);
}
.mdc-switch__track::before, .mdc-switch__track::after {
  border: 1px solid transparent;
  border-radius: inherit;
  box-sizing: border-box;
  content: "";
  height: 100%;
  left: 0;
  position: absolute;
  width: 100%;
  border-width: var(--mat-slide-toggle-track-outline-width, 2px);
  border-color: var(--mat-slide-toggle-track-outline-color, var(--mat-sys-outline));
}
.mdc-switch--selected .mdc-switch__track::before, .mdc-switch--selected .mdc-switch__track::after {
  border-width: var(--mat-slide-toggle-selected-track-outline-width, 2px);
  border-color: var(--mat-slide-toggle-selected-track-outline-color, transparent);
}
.mdc-switch--disabled .mdc-switch__track::before, .mdc-switch--disabled .mdc-switch__track::after {
  border-width: var(--mat-slide-toggle-disabled-unselected-track-outline-width, 2px);
  border-color: var(--mat-slide-toggle-disabled-unselected-track-outline-color, var(--mat-sys-on-surface));
}
@media (forced-colors: active) {
  .mdc-switch__track {
    border-color: currentColor;
  }
}
.mdc-switch__track::before {
  transition: transform 75ms 0ms cubic-bezier(0, 0, 0.2, 1);
  transform: translateX(0);
  background: var(--mat-slide-toggle-unselected-track-color, var(--mat-sys-surface-variant));
}
.mdc-switch--selected .mdc-switch__track::before {
  transition: transform 75ms 0ms cubic-bezier(0.4, 0, 0.6, 1);
  transform: translateX(100%);
}
[dir=rtl] .mdc-switch--selected .mdc-switch--selected .mdc-switch__track::before {
  transform: translateX(-100%);
}
.mdc-switch--selected .mdc-switch__track::before {
  opacity: var(--mat-slide-toggle-hidden-track-opacity, 0);
  transition: var(--mat-slide-toggle-hidden-track-transition, opacity 75ms);
}
.mdc-switch--unselected .mdc-switch__track::before {
  opacity: var(--mat-slide-toggle-visible-track-opacity, 1);
  transition: var(--mat-slide-toggle-visible-track-transition, opacity 75ms);
}
.mdc-switch:enabled:hover:not(:focus):not(:active) .mdc-switch__track::before {
  background: var(--mat-slide-toggle-unselected-hover-track-color, var(--mat-sys-surface-variant));
}
.mdc-switch:enabled:focus:not(:active) .mdc-switch__track::before {
  background: var(--mat-slide-toggle-unselected-focus-track-color, var(--mat-sys-surface-variant));
}
.mdc-switch:enabled:active .mdc-switch__track::before {
  background: var(--mat-slide-toggle-unselected-pressed-track-color, var(--mat-sys-surface-variant));
}
.mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled:hover:not(:focus):not(:active) .mdc-switch__track::before, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled:focus:not(:active) .mdc-switch__track::before, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled:active .mdc-switch__track::before, .mdc-switch.mdc-switch--disabled .mdc-switch__track::before {
  background: var(--mat-slide-toggle-disabled-unselected-track-color, var(--mat-sys-surface-variant));
}
.mdc-switch__track::after {
  transform: translateX(-100%);
  background: var(--mat-slide-toggle-selected-track-color, var(--mat-sys-primary));
}
[dir=rtl] .mdc-switch__track::after {
  transform: translateX(100%);
}
.mdc-switch--selected .mdc-switch__track::after {
  transform: translateX(0);
}
.mdc-switch--selected .mdc-switch__track::after {
  opacity: var(--mat-slide-toggle-visible-track-opacity, 1);
  transition: var(--mat-slide-toggle-visible-track-transition, opacity 75ms);
}
.mdc-switch--unselected .mdc-switch__track::after {
  opacity: var(--mat-slide-toggle-hidden-track-opacity, 0);
  transition: var(--mat-slide-toggle-hidden-track-transition, opacity 75ms);
}
.mdc-switch:enabled:hover:not(:focus):not(:active) .mdc-switch__track::after {
  background: var(--mat-slide-toggle-selected-hover-track-color, var(--mat-sys-primary));
}
.mdc-switch:enabled:focus:not(:active) .mdc-switch__track::after {
  background: var(--mat-slide-toggle-selected-focus-track-color, var(--mat-sys-primary));
}
.mdc-switch:enabled:active .mdc-switch__track::after {
  background: var(--mat-slide-toggle-selected-pressed-track-color, var(--mat-sys-primary));
}
.mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled:hover:not(:focus):not(:active) .mdc-switch__track::after, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled:focus:not(:active) .mdc-switch__track::after, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled:active .mdc-switch__track::after, .mdc-switch.mdc-switch--disabled .mdc-switch__track::after {
  background: var(--mat-slide-toggle-disabled-selected-track-color, var(--mat-sys-on-surface));
}

.mdc-switch__handle-track {
  height: 100%;
  pointer-events: none;
  position: absolute;
  top: 0;
  transition: transform 75ms 0ms cubic-bezier(0.4, 0, 0.2, 1);
  left: 0;
  right: auto;
  transform: translateX(0);
  width: calc(100% - var(--mat-slide-toggle-handle-width));
}
[dir=rtl] .mdc-switch__handle-track {
  left: auto;
  right: 0;
}
.mdc-switch--selected .mdc-switch__handle-track {
  transform: translateX(100%);
}
[dir=rtl] .mdc-switch--selected .mdc-switch__handle-track {
  transform: translateX(-100%);
}

.mdc-switch__handle {
  display: flex;
  pointer-events: auto;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 0;
  right: auto;
  transition: width 75ms cubic-bezier(0.4, 0, 0.2, 1), height 75ms cubic-bezier(0.4, 0, 0.2, 1), margin 75ms cubic-bezier(0.4, 0, 0.2, 1);
  width: var(--mat-slide-toggle-handle-width);
  height: var(--mat-slide-toggle-handle-height);
  border-radius: var(--mat-slide-toggle-handle-shape, var(--mat-sys-corner-full));
}
[dir=rtl] .mdc-switch__handle {
  left: auto;
  right: 0;
}
.mat-mdc-slide-toggle .mdc-switch--unselected .mdc-switch__handle {
  width: var(--mat-slide-toggle-unselected-handle-size, 16px);
  height: var(--mat-slide-toggle-unselected-handle-size, 16px);
  margin: var(--mat-slide-toggle-unselected-handle-horizontal-margin, 0 8px);
}
.mat-mdc-slide-toggle .mdc-switch--unselected .mdc-switch__handle:has(.mdc-switch__icons) {
  margin: var(--mat-slide-toggle-unselected-with-icon-handle-horizontal-margin, 0 4px);
}
.mat-mdc-slide-toggle .mdc-switch--selected .mdc-switch__handle {
  width: var(--mat-slide-toggle-selected-handle-size, 24px);
  height: var(--mat-slide-toggle-selected-handle-size, 24px);
  margin: var(--mat-slide-toggle-selected-handle-horizontal-margin, 0 24px);
}
.mat-mdc-slide-toggle .mdc-switch--selected .mdc-switch__handle:has(.mdc-switch__icons) {
  margin: var(--mat-slide-toggle-selected-with-icon-handle-horizontal-margin, 0 24px);
}
.mat-mdc-slide-toggle .mdc-switch__handle:has(.mdc-switch__icons) {
  width: var(--mat-slide-toggle-with-icon-handle-size, 24px);
  height: var(--mat-slide-toggle-with-icon-handle-size, 24px);
}
.mat-mdc-slide-toggle .mdc-switch:active:not(.mdc-switch--disabled) .mdc-switch__handle {
  width: var(--mat-slide-toggle-pressed-handle-size, 28px);
  height: var(--mat-slide-toggle-pressed-handle-size, 28px);
}
.mat-mdc-slide-toggle .mdc-switch--selected:active:not(.mdc-switch--disabled) .mdc-switch__handle {
  margin: var(--mat-slide-toggle-selected-pressed-handle-horizontal-margin, 0 22px);
}
.mat-mdc-slide-toggle .mdc-switch--unselected:active:not(.mdc-switch--disabled) .mdc-switch__handle {
  margin: var(--mat-slide-toggle-unselected-pressed-handle-horizontal-margin, 0 2px);
}
.mdc-switch--disabled.mdc-switch--selected .mdc-switch__handle::after {
  opacity: var(--mat-slide-toggle-disabled-selected-handle-opacity, 1);
}
.mdc-switch--disabled.mdc-switch--unselected .mdc-switch__handle::after {
  opacity: var(--mat-slide-toggle-disabled-unselected-handle-opacity, 0.38);
}
.mdc-switch__handle::before, .mdc-switch__handle::after {
  border: 1px solid transparent;
  border-radius: inherit;
  box-sizing: border-box;
  content: "";
  width: 100%;
  height: 100%;
  left: 0;
  position: absolute;
  top: 0;
  transition: background-color 75ms 0ms cubic-bezier(0.4, 0, 0.2, 1), border-color 75ms 0ms cubic-bezier(0.4, 0, 0.2, 1);
  z-index: -1;
}
@media (forced-colors: active) {
  .mdc-switch__handle::before, .mdc-switch__handle::after {
    border-color: currentColor;
  }
}
.mdc-switch--selected:enabled .mdc-switch__handle::after {
  background: var(--mat-slide-toggle-selected-handle-color, var(--mat-sys-on-primary));
}
.mdc-switch--selected:enabled:hover:not(:focus):not(:active) .mdc-switch__handle::after {
  background: var(--mat-slide-toggle-selected-hover-handle-color, var(--mat-sys-primary-container));
}
.mdc-switch--selected:enabled:focus:not(:active) .mdc-switch__handle::after {
  background: var(--mat-slide-toggle-selected-focus-handle-color, var(--mat-sys-primary-container));
}
.mdc-switch--selected:enabled:active .mdc-switch__handle::after {
  background: var(--mat-slide-toggle-selected-pressed-handle-color, var(--mat-sys-primary-container));
}
.mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled.mdc-switch--selected:hover:not(:focus):not(:active) .mdc-switch__handle::after, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled.mdc-switch--selected:focus:not(:active) .mdc-switch__handle::after, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled.mdc-switch--selected:active .mdc-switch__handle::after, .mdc-switch--selected.mdc-switch--disabled .mdc-switch__handle::after {
  background: var(--mat-slide-toggle-disabled-selected-handle-color, var(--mat-sys-surface));
}
.mdc-switch--unselected:enabled .mdc-switch__handle::after {
  background: var(--mat-slide-toggle-unselected-handle-color, var(--mat-sys-outline));
}
.mdc-switch--unselected:enabled:hover:not(:focus):not(:active) .mdc-switch__handle::after {
  background: var(--mat-slide-toggle-unselected-hover-handle-color, var(--mat-sys-on-surface-variant));
}
.mdc-switch--unselected:enabled:focus:not(:active) .mdc-switch__handle::after {
  background: var(--mat-slide-toggle-unselected-focus-handle-color, var(--mat-sys-on-surface-variant));
}
.mdc-switch--unselected:enabled:active .mdc-switch__handle::after {
  background: var(--mat-slide-toggle-unselected-pressed-handle-color, var(--mat-sys-on-surface-variant));
}
.mdc-switch--unselected.mdc-switch--disabled .mdc-switch__handle::after {
  background: var(--mat-slide-toggle-disabled-unselected-handle-color, var(--mat-sys-on-surface));
}
.mdc-switch__handle::before {
  background: var(--mat-slide-toggle-handle-surface-color);
}

.mdc-switch__shadow {
  border-radius: inherit;
  bottom: 0;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
}
.mdc-switch:enabled .mdc-switch__shadow {
  box-shadow: var(--mat-slide-toggle-handle-elevation-shadow);
}
.mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled:hover:not(:focus):not(:active) .mdc-switch__shadow, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled:focus:not(:active) .mdc-switch__shadow, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled:active .mdc-switch__shadow, .mdc-switch.mdc-switch--disabled .mdc-switch__shadow {
  box-shadow: var(--mat-slide-toggle-disabled-handle-elevation-shadow);
}

.mdc-switch__ripple {
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: -1;
  width: var(--mat-slide-toggle-state-layer-size, 40px);
  height: var(--mat-slide-toggle-state-layer-size, 40px);
}
.mdc-switch__ripple::after {
  content: "";
  opacity: 0;
}
.mdc-switch--disabled .mdc-switch__ripple::after {
  display: none;
}
.mat-mdc-slide-toggle-disabled-interactive .mdc-switch__ripple::after {
  display: block;
}
.mdc-switch:hover .mdc-switch__ripple::after {
  transition: 75ms opacity cubic-bezier(0, 0, 0.2, 1);
}
.mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled:enabled:focus .mdc-switch__ripple::after, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled:enabled:active .mdc-switch__ripple::after, .mat-mdc-slide-toggle-disabled-interactive.mdc-switch--disabled:enabled:hover:not(:focus) .mdc-switch__ripple::after, .mdc-switch--unselected:enabled:hover:not(:focus) .mdc-switch__ripple::after {
  background: var(--mat-slide-toggle-unselected-hover-state-layer-color, var(--mat-sys-on-surface));
  opacity: var(--mat-slide-toggle-unselected-hover-state-layer-opacity, var(--mat-sys-hover-state-layer-opacity));
}
.mdc-switch--unselected:enabled:focus .mdc-switch__ripple::after {
  background: var(--mat-slide-toggle-unselected-focus-state-layer-color, var(--mat-sys-on-surface));
  opacity: var(--mat-slide-toggle-unselected-focus-state-layer-opacity, var(--mat-sys-focus-state-layer-opacity));
}
.mdc-switch--unselected:enabled:active .mdc-switch__ripple::after {
  background: var(--mat-slide-toggle-unselected-pressed-state-layer-color, var(--mat-sys-on-surface));
  opacity: var(--mat-slide-toggle-unselected-pressed-state-layer-opacity, var(--mat-sys-pressed-state-layer-opacity));
  transition: opacity 75ms linear;
}
.mdc-switch--selected:enabled:hover:not(:focus) .mdc-switch__ripple::after {
  background: var(--mat-slide-toggle-selected-hover-state-layer-color, var(--mat-sys-primary));
  opacity: var(--mat-slide-toggle-selected-hover-state-layer-opacity, var(--mat-sys-hover-state-layer-opacity));
}
.mdc-switch--selected:enabled:focus .mdc-switch__ripple::after {
  background: var(--mat-slide-toggle-selected-focus-state-layer-color, var(--mat-sys-primary));
  opacity: var(--mat-slide-toggle-selected-focus-state-layer-opacity, var(--mat-sys-focus-state-layer-opacity));
}
.mdc-switch--selected:enabled:active .mdc-switch__ripple::after {
  background: var(--mat-slide-toggle-selected-pressed-state-layer-color, var(--mat-sys-primary));
  opacity: var(--mat-slide-toggle-selected-pressed-state-layer-opacity, var(--mat-sys-pressed-state-layer-opacity));
  transition: opacity 75ms linear;
}

.mdc-switch__icons {
  position: relative;
  height: 100%;
  width: 100%;
  z-index: 1;
  transform: translateZ(0);
}
.mdc-switch--disabled.mdc-switch--unselected .mdc-switch__icons {
  opacity: var(--mat-slide-toggle-disabled-unselected-icon-opacity, 0.38);
}
.mdc-switch--disabled.mdc-switch--selected .mdc-switch__icons {
  opacity: var(--mat-slide-toggle-disabled-selected-icon-opacity, 0.38);
}

.mdc-switch__icon {
  bottom: 0;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 0;
  opacity: 0;
  transition: opacity 30ms 0ms cubic-bezier(0.4, 0, 1, 1);
}
.mdc-switch--unselected .mdc-switch__icon {
  width: var(--mat-slide-toggle-unselected-icon-size, 16px);
  height: var(--mat-slide-toggle-unselected-icon-size, 16px);
  fill: var(--mat-slide-toggle-unselected-icon-color, var(--mat-sys-surface-variant));
}
.mdc-switch--unselected.mdc-switch--disabled .mdc-switch__icon {
  fill: var(--mat-slide-toggle-disabled-unselected-icon-color, var(--mat-sys-surface-variant));
}
.mdc-switch--selected .mdc-switch__icon {
  width: var(--mat-slide-toggle-selected-icon-size, 16px);
  height: var(--mat-slide-toggle-selected-icon-size, 16px);
  fill: var(--mat-slide-toggle-selected-icon-color, var(--mat-sys-on-primary-container));
}
.mdc-switch--selected.mdc-switch--disabled .mdc-switch__icon {
  fill: var(--mat-slide-toggle-disabled-selected-icon-color, var(--mat-sys-on-surface));
}

.mdc-switch--selected .mdc-switch__icon--on,
.mdc-switch--unselected .mdc-switch__icon--off {
  opacity: 1;
  transition: opacity 45ms 30ms cubic-bezier(0, 0, 0.2, 1);
}

.mat-mdc-slide-toggle {
  -webkit-user-select: none;
  user-select: none;
  display: inline-block;
  -webkit-tap-highlight-color: transparent;
  outline: 0;
}
.mat-mdc-slide-toggle .mat-mdc-slide-toggle-ripple,
.mat-mdc-slide-toggle .mdc-switch__ripple::after {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.mat-mdc-slide-toggle .mat-mdc-slide-toggle-ripple:not(:empty),
.mat-mdc-slide-toggle .mdc-switch__ripple::after:not(:empty) {
  transform: translateZ(0);
}
.mat-mdc-slide-toggle.mat-mdc-slide-toggle-focused .mat-focus-indicator::before {
  content: "";
}
.mat-mdc-slide-toggle .mat-internal-form-field {
  color: var(--mat-slide-toggle-label-text-color, var(--mat-sys-on-surface));
  font-family: var(--mat-slide-toggle-label-text-font, var(--mat-sys-body-medium-font));
  line-height: var(--mat-slide-toggle-label-text-line-height, var(--mat-sys-body-medium-line-height));
  font-size: var(--mat-slide-toggle-label-text-size, var(--mat-sys-body-medium-size));
  letter-spacing: var(--mat-slide-toggle-label-text-tracking, var(--mat-sys-body-medium-tracking));
  font-weight: var(--mat-slide-toggle-label-text-weight, var(--mat-sys-body-medium-weight));
}
.mat-mdc-slide-toggle .mat-ripple-element {
  opacity: 0.12;
}
.mat-mdc-slide-toggle .mat-focus-indicator::before {
  border-radius: 50%;
}
.mat-mdc-slide-toggle._mat-animation-noopable .mdc-switch__handle-track,
.mat-mdc-slide-toggle._mat-animation-noopable .mdc-switch__icon,
.mat-mdc-slide-toggle._mat-animation-noopable .mdc-switch__handle::before,
.mat-mdc-slide-toggle._mat-animation-noopable .mdc-switch__handle::after,
.mat-mdc-slide-toggle._mat-animation-noopable .mdc-switch__track::before,
.mat-mdc-slide-toggle._mat-animation-noopable .mdc-switch__track::after {
  transition: none;
}
.mat-mdc-slide-toggle .mdc-switch:enabled + .mdc-label {
  cursor: pointer;
}
.mat-mdc-slide-toggle .mdc-switch--disabled + label {
  color: var(--mat-slide-toggle-disabled-label-text-color, var(--mat-sys-on-surface));
}
.mat-mdc-slide-toggle label:empty {
  display: none;
}

.mat-mdc-slide-toggle-touch-target {
  position: absolute;
  top: 50%;
  left: 50%;
  height: var(--mat-slide-toggle-touch-target-size, 48px);
  width: 100%;
  transform: translate(-50%, -50%);
  display: var(--mat-slide-toggle-touch-target-display, block);
}
[dir=rtl] .mat-mdc-slide-toggle-touch-target {
  left: auto;
  right: 50%;
  transform: translate(50%, -50%);
}
`],encapsulation:2,changeDetection:0})}return n})(),rl=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=we({type:n});static \u0275inj=ke({imports:[wa,Fe]})}return n})();var $i=class extends Error{retryAfterSeconds;constructor(s){super("Camera discovery is busy \u2014 try again shortly"),this.retryAfterSeconds=s,this.name="DiscoveryRateLimitedError"}},ll=(()=>{class n{fetchImpl=(e,t)=>fetch(e,t);scan(e){return N(this,null,function*(){let t=ep(e);if(!t)throw new Error("Camera discovery is unavailable");let i=yield this.fetchImpl(t,{method:"GET"});if(i.status===429)throw new $i(Number(i.headers?.get?.("Retry-After"))||0);if(!i.ok)throw new Error(`Camera discovery failed (${i.status})`);let r=yield i.json();return Array.isArray(r?.cameras)?r.cameras:[]})}static \u0275fac=function(t){return new(t||n)};static \u0275prov=xe({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})();function ep(n){if(!n)return null;let s;try{s=new URL(n)}catch(t){return null}if(s.protocol!=="http:"&&s.protocol!=="https:")return null;let e=s.href.endsWith("/")?s.href:`${s.href}/`;return new URL("cameras/discover",e).href}var sl=/^[A-Za-z0-9-]+$/,dl=(()=>{class n{fetchImpl=(e,t)=>fetch(e,t);list(e){return N(this,null,function*(){let t=this.collectionUrl(e),i=yield this.fetchImpl(t,{method:"GET"});if(i.status===404)return[];if(!i.ok)throw new Error(`Could not load cameras (${i.status})`);let r=yield i.json();return!r||typeof r!="object"?[]:Object.entries(r).filter(([c,p])=>sl.test(c)&&p&&typeof p=="object").map(([c,p])=>R({id:c},p)).sort((c,p)=>(c.name||c.id).localeCompare(p.name||p.id))})}save(e,t,i){return N(this,null,function*(){let r=this.itemUrl(e,t),c=yield this.fetchImpl(r,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!c.ok)throw new Error(`Could not save camera (${c.status})`)})}remove(e,t){return N(this,null,function*(){let i=this.itemUrl(e,t),r=yield this.fetchImpl(i,{method:"DELETE"});if(!r.ok&&r.status!==404)throw new Error(`Could not delete camera (${r.status})`)})}collectionUrl(e){return`${this.baseOrThrow(e)}/resources/cameras`}itemUrl(e,t){if(!sl.test(t))throw new Error("Invalid camera id");return`${this.collectionUrl(e)}/${t}`}baseOrThrow(e){let t=e?.trim();if(!t)throw new Error("Signal K server is not connected");return t.endsWith("/")?t.slice(0,-1):t}static \u0275fac=function(t){return new(t||n)};static \u0275prov=xe({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})();var tp=/^[A-Za-z0-9-]+$/,cl=(()=>{class n{fetchImpl=(e,t)=>fetch(e,t);set(e,t,i){return N(this,null,function*(){let r=this.urlFor(e,t),c=yield this.fetchImpl(r,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!c.ok)throw new Error(`Could not save camera credentials (${c.status})`)})}clear(e,t){return N(this,null,function*(){let i=this.urlFor(e,t),r=yield this.fetchImpl(i,{method:"DELETE"});if(!r.ok&&r.status!==404)throw new Error(`Could not clear camera credentials (${r.status})`)})}presence(e,t){return N(this,null,function*(){let i=this.urlFor(e,t),r=yield this.fetchImpl(i,{method:"GET"});if(!r.ok)return{hasUsername:!1,hasPassword:!1};let c=yield r.json();return{hasUsername:!!c?.hasUsername,hasPassword:!!c?.hasPassword}})}urlFor(e,t){if(!e)throw new Error("Signal K server is not connected");if(!tp.test(t))throw new Error("Invalid camera id");let i;try{i=new URL(e)}catch(c){throw new Error("Invalid server URL")}if(i.protocol!=="http:"&&i.protocol!=="https:")throw new Error("Invalid server URL");let r=i.href.endsWith("/")?i.href:`${i.href}/`;return new URL(`cameras/${t}/credentials`,r).href}static \u0275fac=function(t){return new(t||n)};static \u0275prov=xe({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})();var ml=(()=>{class n{fetchImpl=(e,t)=>fetch(e,t);test(e,t){return N(this,null,function*(){let i=ip(e);if(!i)throw new Error("The SK Video plugin is unavailable");let c=yield(yield this.fetchImpl(i,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).json().catch(()=>null);return c&&typeof c.ok=="boolean"?c:{ok:!1,message:"Could not test the connection."}})}static \u0275fac=function(t){return new(t||n)};static \u0275prov=xe({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})();function ip(n){if(!n)return null;let s;try{s=new URL(n)}catch(t){return null}if(s.protocol!=="http:"&&s.protocol!=="https:")return null;let e=s.href.endsWith("/")?s.href:`${s.href}/`;return new URL("cameras/test",e).href}var Sa=["rtsp","rtsps","rtmp","http","https","onvif"],np=/^[A-Za-z0-9._:-]+$/,ap=/^\/[A-Za-z0-9._~!$&'()*+,;=:@/%-]*$/;function Ma(n){let s=[],e=(n.name??"").trim();e?e.length>100&&s.push("Name is too long"):s.push("Name is required");let t=(n.scheme??"").trim().toLowerCase();Sa.includes(t)||s.push("Choose a valid stream type");let i=(n.host??"").trim();i?np.test(i)||s.push("Address contains invalid characters"):s.push("Address (host or IP) is required");let r;n.port!==void 0&&n.port!==null&&`${n.port}`.trim()!==""&&(r=Number(n.port),(!Number.isInteger(r)||r<1||r>65535)&&(s.push("Port must be between 1 and 65535"),r=void 0));let c,p=(n.path??"").trim();if(p&&(!p.startsWith("/")||p.includes("..")||!ap.test(p)?s.push('Path must be an absolute URL path without ".."'):c=p),s.length)return{valid:!1,errors:s};let _={scheme:t,host:i};return r!==void 0&&(_.port=r),c!==void 0&&(_.path=c),{valid:!0,errors:[],value:{name:e,enabled:!0,source:_}}}function pl(n,s="camera"){return n.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48)||s}function ul(n){return{name:n.name,host:n.host,port:n.port,scheme:"rtsp"}}var hl=(n,s)=>s.id,lp=(n,s)=>s.host;function sp(n,s){n&1&&(o(0,"div",9)(1,"mat-icon"),l(2,"extension_off"),a(),o(3,"span"),l(4," The "),o(5,"strong"),l(6,"SK Video"),a(),l(7," plugin isn't available on your Signal K server. Install and enable it to add cameras and upload video. A web address (URL) works without it. "),a()())}function dp(n,s){n&1&&(o(0,"mat-form-field",16)(1,"mat-label"),l(2,"Video URL"),a(),b(3,"input",38),o(4,"mat-hint"),l(5," Paste a link to a video or live stream that opens in a web browser. For an onboard IP camera (RTSP/RTMP), add it under the Camera tab instead. "),a()(),o(6,"mat-form-field",33)(7,"mat-label"),l(8,"Video type"),a(),o(9,"mat-select",39)(10,"mat-option",40),l(11,"Detect automatically"),a(),o(12,"mat-option",7),l(13,"Recorded video file (MP4/WebM)"),a(),o(14,"mat-option",41),l(15,"Live stream (HLS)"),a(),o(16,"mat-option",42),l(17,"Camera image stream (MJPEG)"),a(),o(18,"mat-option",43),l(19,"Live, lowest delay (WebRTC)"),a()()())}function cp(n,s){n&1&&(o(0,"span",58),l(1," \xB7 off"),a())}function mp(n,s){if(n&1&&(o(0,"mat-option",47),l(1),h(2,cp,2,0,"span",58),a()),n&2){let e=s.$implicit;g("value",e.id),d(),B(" ",e.name),d(),f(e.enabled?-1:2)}}function pp(n,s){n&1&&(o(0,"mat-option",48),l(1,"No saved cameras \u2014 add one below"),a()),n&2&&g("value",null)}function up(n,s){n&1&&(o(0,"small",66),l(1),a()),n&2&&(d(),v(s))}function hp(n,s){if(n&1){let e=P();o(0,"mat-slide-toggle",59),C("change",function(i){y(e);let r=u(2);return x(r.toggleEnabled(i.checked))}),l(1),a(),o(2,"div",60)(3,"span",15),l(4,"Test pan / tilt \u2014 hold a direction (PTZ cameras only)"),a(),o(5,"div",61)(6,"button",62),C("pointerdown",function(i){y(e);let r=u(2);return x(r.startNudge(0,.5,i))})("pointerup",function(){y(e);let i=u(2);return x(i.stopNudge())})("pointercancel",function(){y(e);let i=u(2);return x(i.stopNudge())})("lostpointercapture",function(){y(e);let i=u(2);return x(i.stopNudge())})("blur",function(){y(e);let i=u(2);return x(i.stopNudge())})("keydown.enter",function(i){y(e);let r=u(2);return x(!i.repeat&&r.startNudge(0,.5))})("keydown.space",function(i){y(e);let r=u(2);return x(!i.repeat&&r.startNudge(0,.5))})("keyup",function(){y(e);let i=u(2);return x(i.stopNudge())}),o(7,"mat-icon"),l(8,"keyboard_arrow_up"),a()(),o(9,"button",63),C("pointerdown",function(i){y(e);let r=u(2);return x(r.startNudge(-.5,0,i))})("pointerup",function(){y(e);let i=u(2);return x(i.stopNudge())})("pointercancel",function(){y(e);let i=u(2);return x(i.stopNudge())})("lostpointercapture",function(){y(e);let i=u(2);return x(i.stopNudge())})("blur",function(){y(e);let i=u(2);return x(i.stopNudge())})("keydown.enter",function(i){y(e);let r=u(2);return x(!i.repeat&&r.startNudge(-.5,0))})("keydown.space",function(i){y(e);let r=u(2);return x(!i.repeat&&r.startNudge(-.5,0))})("keyup",function(){y(e);let i=u(2);return x(i.stopNudge())}),o(10,"mat-icon"),l(11,"keyboard_arrow_left"),a()(),o(12,"button",64),C("pointerdown",function(i){y(e);let r=u(2);return x(r.startNudge(.5,0,i))})("pointerup",function(){y(e);let i=u(2);return x(i.stopNudge())})("pointercancel",function(){y(e);let i=u(2);return x(i.stopNudge())})("lostpointercapture",function(){y(e);let i=u(2);return x(i.stopNudge())})("blur",function(){y(e);let i=u(2);return x(i.stopNudge())})("keydown.enter",function(i){y(e);let r=u(2);return x(!i.repeat&&r.startNudge(.5,0))})("keydown.space",function(i){y(e);let r=u(2);return x(!i.repeat&&r.startNudge(.5,0))})("keyup",function(){y(e);let i=u(2);return x(i.stopNudge())}),o(13,"mat-icon"),l(14,"keyboard_arrow_right"),a()(),o(15,"button",65),C("pointerdown",function(i){y(e);let r=u(2);return x(r.startNudge(0,-.5,i))})("pointerup",function(){y(e);let i=u(2);return x(i.stopNudge())})("pointercancel",function(){y(e);let i=u(2);return x(i.stopNudge())})("lostpointercapture",function(){y(e);let i=u(2);return x(i.stopNudge())})("blur",function(){y(e);let i=u(2);return x(i.stopNudge())})("keydown.enter",function(i){y(e);let r=u(2);return x(!i.repeat&&r.startNudge(0,-.5))})("keydown.space",function(i){y(e);let r=u(2);return x(!i.repeat&&r.startNudge(0,-.5))})("keyup",function(){y(e);let i=u(2);return x(i.stopNudge())}),o(16,"mat-icon"),l(17,"keyboard_arrow_down"),a()()(),h(18,up,2,1,"small",66),a()}if(n&2){let e,t=s,i=u(2);g("checked",t.enabled),d(),B(" ",t.enabled?"Enabled \u2014 streaming":"Disabled \u2014 not streaming"," "),d(17),f((e=i.ptzTestError())?18:-1,e)}}function fp(n,s){n&1&&b(0,"mat-progress-spinner",53)}function gp(n,s){n&1&&(o(0,"small",54),l(1),a()),n&2&&(d(),v(s))}function _p(n,s){if(n&1){let e=P();o(0,"button",68),C("click",function(){let i=y(e).$implicit,r=u(3);return x(r.useCandidate(i))}),o(1,"mat-icon"),l(2,"add"),a(),o(3,"span",69),l(4),a(),o(5,"span",70),l(6),a(),o(7,"small"),l(8),a()()}if(n&2){let e=s.$implicit,t=u(3);d(4),v(e.name),d(2),v(t.candidateProtocol(e)),d(2),v(e.host)}}function bp(n,s){if(n&1&&(o(0,"div",55),I(1,_p,9,3,"button",67,lp),a()),n&2){let e=u(2);d(),A(e.candidates())}}function vp(n,s){if(n&1){let e=P();o(0,"button",71),C("click",function(){y(e);let i=u(2);return x(i.manualOpen.set(!0))}),o(1,"mat-icon"),l(2,"add"),a(),o(3,"span"),l(4,"Add a camera"),a()()}}function Cp(n,s){if(n&1&&(o(0,"mat-option",47),l(1),a()),n&2){let e=s.$implicit,t=u(3);g("value",e),d(),v(t.schemeLabel(e))}}function yp(n,s){if(n&1){let e=P();o(0,"div",89)(1,"mat-icon"),l(2,"lock"),a(),o(3,"span"),l(4,"Credentials saved. Leave the fields blank to keep them, or type new ones to replace."),a(),o(5,"button",90),C("click",function(){y(e);let i=u(4);return x(i.clearCredentials())}),l(6," Clear "),a()()}if(n&2){let e=u(4);d(5),g("disabled",e.clearingCredentials())}}function xp(n,s){n&1&&(o(0,"small",15),l(1,"No credentials saved for this camera."),a())}function kp(n,s){if(n&1&&h(0,yp,7,1,"div",89)(1,xp,2,0,"small",15),n&2){let e=s;f(e.hasUsername||e.hasPassword?0:1)}}function wp(n,s){n&1&&b(0,"mat-progress-spinner",85)}function Sp(n,s){n&1&&(o(0,"mat-icon"),l(1,"wifi_tethering"),a())}function Mp(n,s){if(n&1){let e=P();o(0,"button",91),C("click",function(){y(e);let i=u(3);return x(i.cancelEdit())}),l(1,"Cancel"),a()}}function Tp(n,s){if(n&1&&(o(0,"small",92),l(1),a()),n&2){let e=s;G("video-setup__test--ok",e.ok)("video-setup__test--bad",!e.ok),d(),We(" ",e.ok?"\u2713 ":"\u2717 ","",e.message," ")}}function Ep(n,s){n&1&&(o(0,"small",66),l(1),a()),n&2&&(d(),v(s))}function Ip(n,s){if(n&1){let e=P();o(0,"fieldset",57)(1,"legend",3),l(2),a(),o(3,"mat-form-field")(4,"mat-label"),l(5,"Name"),a(),b(6,"input",72),o(7,"mat-error"),l(8,"A name is required."),a()(),o(9,"div",73)(10,"mat-form-field",74)(11,"mat-label"),l(12,"Camera type"),a(),o(13,"mat-select",75),I(14,Cp,2,2,"mat-option",47,_e),a()(),o(16,"mat-form-field",76)(17,"mat-label"),l(18,"Address (host or IP)"),a(),o(19,"input",77),C("blur",function(){y(e);let i=u(2);return x(i.normalizeHost())}),a(),o(20,"mat-hint"),l(21,"You can paste host:port or a full URL."),a(),o(22,"mat-error"),l(23,"Enter the camera\u2019s address."),a()(),o(24,"mat-form-field",78)(25,"mat-label"),l(26,"Port"),a(),b(27,"input",79),o(28,"mat-error"),l(29,"1\u201365535."),a()()(),o(30,"mat-form-field")(31,"mat-label"),l(32,"Path (optional)"),a(),b(33,"input",80),o(34,"mat-error"),l(35,"Start the path with \u201C/\u201D."),a()(),o(36,"div",73)(37,"mat-form-field",76)(38,"mat-label"),l(39,"Username (optional)"),a(),b(40,"input",81),a(),o(41,"mat-form-field",76)(42,"mat-label"),l(43,"Password (optional)"),a(),b(44,"input",82),a()(),o(45,"small",83),l(46," Credentials are stored on the Signal K server only and never synced to your devices. "),a(),h(47,kp,2,1),o(48,"div",84)(49,"button",52),C("click",function(){y(e);let i=u(2);return x(i.testConnection())}),h(50,wp,1,0,"mat-progress-spinner",85)(51,Sp,2,0,"mat-icon"),o(52,"span"),l(53,"Test connection"),a()(),o(54,"button",86),C("click",function(){y(e);let i=u(2);return x(i.addCamera())}),o(55,"mat-icon"),l(56),a(),o(57,"span"),l(58),a()(),h(59,Mp,2,0,"button",87),a(),h(60,Tp,2,6,"small",88),h(61,Ep,2,1,"small",66),a()}if(n&2){let e,t,i,r=u(2);g("formGroup",r.manualForm),d(2),v(r.editingId()?"Edit camera":"Add a camera"),d(12),A(r.schemes),d(33),f((e=r.editingId()&&r.credentialPresence())?47:-1,e),d(2),g("disabled",r.testing()),d(),f(r.testing()?50:51),d(4),g("disabled",r.saving()),d(2),v(r.editingId()?"save":"add"),d(2),v(r.editingId()?"Save changes":"Add camera"),d(),f(r.editingId()?59:-1),d(),f((t=r.testResult())?60:-1,t),d(),f((i=r.addError())?61:-1,i)}}function Ap(n,s){if(n&1){let e=P();o(0,"div",44)(1,"mat-form-field",45)(2,"mat-label"),l(3,"Camera"),a(),o(4,"mat-select",46),C("selectionChange",function(i){y(e);let r=u();return x(r.onCameraSelected(i.value))}),I(5,mp,3,3,"mat-option",47,hl),h(7,pp,2,1,"mat-option",48),a()(),o(8,"button",49),C("click",function(){y(e);let i=u();return x(i.editSelectedCamera())}),o(9,"mat-icon"),l(10,"edit"),a()(),o(11,"button",50),C("click",function(){y(e);let i=u();return x(i.removeSelected())}),o(12,"mat-icon"),l(13,"delete"),a()()(),h(14,hp,19,3),o(15,"mat-form-field",33)(16,"mat-label"),l(17,"Connection"),a(),o(18,"mat-select",39)(19,"mat-option",41),l(20,"Standard (HLS)"),a(),o(21,"mat-option",43),l(22,"Live \u2014 lowest delay (WebRTC)"),a()(),o(23,"mat-hint"),l(24,"Your Signal K server connects to the camera and sends the video to this screen."),a()(),o(25,"div",51)(26,"button",52),C("click",function(){y(e);let i=u();return x(i.scan())}),o(27,"mat-icon"),l(28,"travel_explore"),a(),o(29,"span"),l(30,"Scan network"),a()(),h(31,fp,1,0,"mat-progress-spinner",53),h(32,gp,2,1,"small",54),a(),h(33,bp,3,0,"div",55),h(34,vp,5,0,"button",56)(35,Ip,62,11,"fieldset",57)}if(n&2){let e,t,i=u();d(5),A(i.cameras()),d(2),f(i.cameras().length?-1:7),d(),g("disabled",!i.selectedCamera),d(6),f((e=i.selectedCamera)?14:-1,e),d(12),g("disabled",i.scanning()),d(5),f(i.scanning()?31:-1),d(),f((t=i.scanMessage())?32:-1,t),d(),f(i.candidates().length?33:-1),d(),f(i.manualOpen()?35:34)}}function Dp(n,s){if(n&1&&(o(0,"mat-option",47),l(1),a()),n&2){let e=s.$implicit,t=u(2);g("value",e.id),d(),We("",e.name," (",t.sizeLabel(e.size),")")}}function Pp(n,s){n&1&&(o(0,"mat-option",48),l(1,"No uploaded videos yet"),a()),n&2&&g("value",null)}function Op(n,s){n&1&&b(0,"mat-progress-spinner",53)}function Fp(n,s){n&1&&(o(0,"small",66),l(1),a()),n&2&&(d(),v(s))}function Rp(n,s){if(n&1){let e=P();o(0,"div",44)(1,"mat-form-field",45)(2,"mat-label"),l(3,"Video"),a(),o(4,"mat-select",93),I(5,Dp,2,3,"mat-option",47,hl),h(7,Pp,2,1,"mat-option",48),a()(),o(8,"button",94),C("click",function(){y(e);let i=u();return x(i.removeVideo())}),o(9,"mat-icon"),l(10,"delete"),a()()(),o(11,"div",51)(12,"button",52),C("click",function(){y(e);let i=Y(18);return x(i.click())}),o(13,"mat-icon"),l(14,"upload"),a(),o(15,"span"),l(16,"Upload a video"),a()(),o(17,"input",95,0),C("change",function(i){y(e);let r=u();return x(r.onFileSelected(i))}),a(),h(19,Op,1,0,"mat-progress-spinner",53),a(),o(20,"small",15),l(21," Videos are stored on your Signal K server and play back with seeking, on any device. "),a(),h(22,Fp,2,1,"small",66)}if(n&2){let e,t=u();d(5),A(t.videos()),d(2),f(t.videos().length?-1:7),d(5),g("disabled",t.uploading()),d(7),f(t.uploading()?19:-1),d(3),f((e=t.uploadError())?22:-1,e)}}var fl=(()=>{class n{formGroupName=S.required();rootFormGroup=m(U);connection=m(cn);discovery=m(ll);resources=m(dl);credentials=m(cl);probe=m(ml);ptz=m(Ho);assets=m(Ko);pluginConfig=m(kn);videoGroup;manualForm;schemes=Sa;endpoint=Ni(this.connection.serverServiceEndpoint$,{initialValue:null});pluginBaseUrl=ue(()=>Wo("sk-video",this.endpoint()?.httpServiceUrl??null,this.connection.signalKURL?.url??null));v2BaseUrl=ue(()=>$o(this.endpoint()?.httpServiceUrlV2,this.endpoint()?.httpServiceUrl??null,this.connection.signalKURL?.url??null));cameras=T([]);candidates=T([]);scanning=T(!1);scanMessage=T(null);addError=T(null);saving=T(!1);manualOpen=T(!1);editingId=T(null);credentialPresence=T(null);clearingCredentials=T(!1);testing=T(!1);testResult=T(null);ptzTestError=T(null);ptzHeld=!1;videos=T([]);uploading=T(!1);uploadError=T(null);pluginState=T("unknown");get pluginMissing(){return(this.sourceKind==="camera"||this.sourceKind==="file")&&this.pluginState()==="missing"}ngOnInit(){let e=this.rootFormGroup.control.get(this.formGroupName());e instanceof Ve?this.videoGroup=e:(this.videoGroup=new Ve({}),this.rootFormGroup.control.addControl(this.formGroupName(),this.videoGroup)),this.ensure("sourceKind","url"),this.ensure("url",null),this.ensure("cameraId",null),this.ensure("fileAssetId",null),this.ensure("transport","auto"),this.ensure("preset","balanced"),this.ensure("muted",!0),this.ensure("autoplay",!1),this.ensure("loop",!1),this.ensure("objectFit","contain"),this.ensure("label",null),this.ensureGroup("snapshot",{embedTelemetry:!0,embedLocation:!0,defaultDestination:"download"}),this.manualForm=new Ve({name:new L("",[z.required,z.maxLength(100)]),scheme:new L("rtsp",z.required),host:new L("",[z.required,z.pattern(/^[A-Za-z0-9._-]+$/)]),port:new L(null,[z.min(1),z.max(65535)]),path:new L("",z.pattern(/^\/[^\s]*$/)),username:new L(""),password:new L("")}),this.refreshCameras(),this.refreshVideos(),this.probePlugin()}probePlugin(){return N(this,null,function*(){try{this.pluginState.set(qo(yield this.pluginConfig.getPlugin("sk-video")))}catch(e){this.pluginState.set("unknown")}})}refreshVideos(){return N(this,null,function*(){try{this.videos.set(yield this.assets.list(this.pluginBaseUrl()))}catch(e){}})}onFileSelected(e){let t=e.target,i=t.files?.[0];t.value="",i&&this.uploadFile(i)}uploadFile(e){return N(this,null,function*(){this.uploadError.set(null),this.uploading.set(!0);try{let t=yield this.assets.upload(this.pluginBaseUrl(),e);yield this.refreshVideos(),this.videoGroup.get("fileAssetId")?.setValue(t.id)}catch(t){this.uploadError.set(t instanceof jo?t.message:"Upload failed \u2014 is the SK Video plugin installed and enabled?")}finally{this.uploading.set(!1)}})}removeVideo(){return N(this,null,function*(){let e=this.videoGroup.get("fileAssetId")?.value;if(e)try{yield this.assets.remove(this.pluginBaseUrl(),e),this.videoGroup.get("fileAssetId")?.setValue(null),yield this.refreshVideos()}catch(t){this.uploadError.set("Could not remove the video.")}})}sizeLabel(e){return e>=1024*1024*1024?`${(e/(1024*1024*1024)).toFixed(1)} GB`:`${Math.max(1,Math.round(e/(1024*1024)))} MB`}schemeLabel(e){return{rtsp:"IP camera (RTSP)",rtsps:"IP camera, secure (RTSPS)",rtmp:"RTMP stream",http:"Web camera (HTTP)",https:"Web camera, secure (HTTPS)",onvif:"ONVIF camera"}[e]??e}get sourceKind(){return this.videoGroup?.get("sourceKind")?.value??"url"}get selectedCamera(){let e=this.videoGroup?.get("cameraId")?.value;return e?this.cameras().find(t=>t.id===e):void 0}onCameraSelected(e){this.prefillTitleFromCamera(this.cameras().find(t=>t.id===e)?.name)}prefillTitleFromCamera(e){let t=this.videoGroup.get("label");e&&t&&!`${t.value??""}`.trim()&&(t.setValue(e),t.markAsDirty())}get presetHint(){return Uo(this.videoGroup?.get("preset")?.value??"balanced").hint}refreshCameras(){return N(this,null,function*(){try{this.cameras.set(yield this.resources.list(this.v2BaseUrl())),this.cameras().length===0&&this.manualOpen.set(!0)}catch(e){}})}normalizeHost(){let e=String(this.manualForm.get("host")?.value??"").trim();if(!e)return;let t=e.match(/^(rtsp|rtsps|rtmp|https?|onvif):\/\/(?:[^@/]+@)?([^:/]+)(?::(\d+))?(\/.*)?$/i);if(t){this.manualForm.patchValue({scheme:t[1].toLowerCase(),host:t[2],port:t[3]?Number(t[3]):this.manualForm.get("port")?.value,path:t[4]??this.manualForm.get("path")?.value});return}let i=e.match(/^([A-Za-z0-9._-]+):(\d+)$/);i&&this.manualForm.patchValue({host:i[1],port:Number(i[2])})}testConnection(){return N(this,null,function*(){this.manualForm.markAllAsTouched();let e=this.manualForm.value,t=Ma(e);if(!t.valid||!t.value){this.testResult.set({ok:!1,message:t.errors.join(". ")||"Check the camera details."});return}this.testing.set(!0),this.testResult.set(null);try{this.testResult.set(yield this.probe.test(this.pluginBaseUrl(),{source:t.value.source,username:`${e.username??""}`.trim()||void 0,password:`${e.password??""}`||void 0}))}catch(i){this.testResult.set({ok:!1,message:"Couldn\u2019t reach the SK Video plugin."})}finally{this.testing.set(!1)}})}scan(){return N(this,null,function*(){if(!this.scanning()){this.scanning.set(!0),this.scanMessage.set(null),this.candidates.set([]);try{let e=yield this.discovery.scan(this.pluginBaseUrl());this.candidates.set(e),e.length||this.scanMessage.set("No cameras found on the network.")}catch(e){if(e instanceof $i){let t=e.retryAfterSeconds?` Try again in ${e.retryAfterSeconds}s.`:"";this.scanMessage.set(`A scan is already running.${t}`)}else this.scanMessage.set("Scan failed \u2014 is the SK Video plugin installed and enabled?")}finally{this.scanning.set(!1)}}})}candidateProtocol(e){return e.onvifUrl?"ONVIF":"RTSP"}useCandidate(e){this.manualOpen.set(!0),this.editingId.set(null),this.manualForm.patchValue(ul(e)),this.addError.set(null),this.testResult.set(null)}editSelectedCamera(){let e=this.selectedCamera;e&&(this.editingId.set(e.id),this.manualOpen.set(!0),this.addError.set(null),this.testResult.set(null),this.credentialPresence.set(null),this.manualForm.reset({name:e.name,scheme:e.source.scheme,host:e.source.host,port:e.source.port??null,path:e.source.path??"",username:"",password:""}),this.refreshCredentialPresence(e.id))}refreshCredentialPresence(e){return N(this,null,function*(){try{this.credentialPresence.set(yield this.credentials.presence(this.pluginBaseUrl(),e))}catch(t){this.credentialPresence.set(null)}})}clearCredentials(){return N(this,null,function*(){let e=this.editingId();if(e){this.clearingCredentials.set(!0);try{yield this.credentials.clear(this.pluginBaseUrl(),e),this.credentialPresence.set({hasUsername:!1,hasPassword:!1}),this.manualForm.patchValue({username:"",password:""})}catch(t){this.addError.set("Could not clear the saved credentials.")}finally{this.clearingCredentials.set(!1)}}})}cancelEdit(){this.editingId.set(null),this.addError.set(null),this.testResult.set(null),this.credentialPresence.set(null),this.manualForm.reset({scheme:"rtsp",port:null}),this.manualOpen.set(!1)}toggleEnabled(e){return N(this,null,function*(){let t=this.selectedCamera;if(t)try{yield this.resources.save(this.v2BaseUrl(),t.id,{name:t.name,enabled:e,source:t.source}),yield this.refreshCameras()}catch(i){this.addError.set("Could not update the camera.")}})}get canTestPtz(){return!!this.selectedCamera}startNudge(e,t,i){return N(this,null,function*(){let r=this.selectedCamera;if(r){this.ptzHeld=!0,this.ptzTestError.set(null),this.capturePointer(i);try{yield this.ptz.move(this.pluginBaseUrl(),r.id,{pan:e,tilt:t,zoom:0})}catch(c){this.ptzHeld=!1,this.ptzTestError.set("This camera didn\u2019t accept pan/tilt \u2014 it may not support PTZ.")}}})}stopNudge(){return N(this,null,function*(){if(!this.ptzHeld)return;this.ptzHeld=!1;let e=this.selectedCamera;if(e)try{yield this.ptz.stop(this.pluginBaseUrl(),e.id)}catch(t){}})}capturePointer(e){if(e&&"pointerId"in e)try{e.target.setPointerCapture(e.pointerId)}catch(t){}}ngOnDestroy(){this.stopNudge()}addCamera(){return N(this,null,function*(){this.manualForm.markAllAsTouched(),this.addError.set(null);let e=this.manualForm.value,t=Ma(e);if(!t.valid||!t.value){this.addError.set(t.errors.join(". "));return}let i=this.editingId(),r=i??this.uniqueId(pl(t.value.name)),c=i?W(R({},t.value),{enabled:this.cameras().find(p=>p.id===i)?.enabled??!0}):t.value;this.saving.set(!0);try{yield this.resources.save(this.v2BaseUrl(),r,c);let p=`${e.username??""}`.trim(),_=`${e.password??""}`;(p||_)&&(yield this.credentials.set(this.pluginBaseUrl(),r,{username:p,password:_})),yield this.refreshCameras(),this.videoGroup.get("cameraId")?.setValue(r),this.prefillTitleFromCamera(t.value.name),this.manualForm.reset({scheme:"rtsp",port:null}),this.candidates.set([]),this.editingId.set(null),this.credentialPresence.set(null),i&&this.manualOpen.set(!1)}catch(p){this.addError.set("Could not save the camera. Check the SK Video plugin and your details.")}finally{this.saving.set(!1)}})}removeSelected(){return N(this,null,function*(){let e=this.videoGroup.get("cameraId")?.value;if(e)try{yield this.resources.remove(this.v2BaseUrl(),e),this.videoGroup.get("cameraId")?.setValue(null),yield this.refreshCameras()}catch(t){this.addError.set("Could not remove the camera.")}})}uniqueId(e){let t=new Set(this.cameras().map(r=>r.id));if(!t.has(e))return e;let i=2;for(;t.has(`${e}-${i}`);)i++;return`${e}-${i}`}ensure(e,t){this.videoGroup.get(e)||this.videoGroup.addControl(e,new L(t))}ensureGroup(e,t){let i=this.videoGroup.get(e);i instanceof Ve||(i=new Ve({}),this.videoGroup.addControl(e,i));for(let[r,c]of Object.entries(t))i.get(r)||i.addControl(r,new L(c))}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["video-camera-setup"]],inputs:{formGroupName:[1,"formGroupName"]},decls:94,vars:6,consts:[["fileInput",""],[1,"tab-content","video-setup",3,"formGroup"],[1,"video-setup__section"],[1,"video-setup__label"],["formControlName","sourceKind","aria-label","Video source",1,"video-setup__sources"],["value","camera"],[1,"video-setup__source-name"],["value","file"],["value","url"],["role","status","aria-live","polite",1,"video-setup__plugin-banner"],["formControlName","preset","aria-label","Quality and latency preset",1,"video-setup__sources"],["value","live"],[1,"video-setup__soon"],["value","balanced"],["value","best"],[1,"video-setup__hint"],[1,"video-setup__url"],["matInput","","formControlName","label","placeholder","Foredeck","maxlength","40"],[1,"video-setup__appearance"],["formControlName","objectFit"],["value","contain"],["value","cover"],["value","fill"],[1,"video-setup__toggles"],["formControlName","muted"],["formControlName","autoplay"],["formControlName","loop"],["formGroupName","snapshot",1,"video-setup__section"],[1,"video-setup__toggles","video-setup__toggles--stacked"],["formControlName","embedLocation","aria-describedby","loc-privacy"],["id","loc-privacy",1,"video-setup__hint"],["formControlName","embedTelemetry","aria-describedby","tel-privacy"],["id","tel-privacy",1,"video-setup__hint"],[1,"video-setup__fit"],["formControlName","defaultDestination"],["value","download"],["value","share"],["value","signalk","disabled",""],["matInput","","type","url","formControlName","url","placeholder","https://example.com/deck-camera.m3u8"],["formControlName","transport"],["value","auto"],["value","hls"],["value","mjpeg"],["value","webrtc"],[1,"video-setup__camera-row"],[1,"video-setup__camera-pick"],["formControlName","cameraId",3,"selectionChange"],[3,"value"],["disabled","",3,"value"],["mat-icon-button","","type","button","matTooltip","Edit selected camera","aria-label","Edit selected camera",3,"click","disabled"],["mat-icon-button","","type","button","matTooltip","Remove selected camera","aria-label","Remove selected camera",3,"click"],[1,"video-setup__scan"],["mat-stroked-button","","type","button",3,"click","disabled"],["diameter","20","mode","indeterminate"],["role","status","aria-live","polite",1,"video-setup__hint"],[1,"video-setup__candidates"],["mat-stroked-button","","type","button",1,"video-setup__add"],[1,"video-setup__manual",3,"formGroup"],[1,"video-setup__off"],[1,"video-setup__enable",3,"change","checked"],[1,"video-setup__ptz-test"],["role","group","aria-label","PTZ test controls",1,"video-setup__ptz-pad"],["mat-icon-button","","type","button","aria-label","Tilt up",1,"video-setup__ptz-up",3,"pointerdown","pointerup","pointercancel","lostpointercapture","blur","keydown.enter","keydown.space","keyup"],["mat-icon-button","","type","button","aria-label","Pan left",1,"video-setup__ptz-left",3,"pointerdown","pointerup","pointercancel","lostpointercapture","blur","keydown.enter","keydown.space","keyup"],["mat-icon-button","","type","button","aria-label","Pan right",1,"video-setup__ptz-right",3,"pointerdown","pointerup","pointercancel","lostpointercapture","blur","keydown.enter","keydown.space","keyup"],["mat-icon-button","","type","button","aria-label","Tilt down",1,"video-setup__ptz-down",3,"pointerdown","pointerup","pointercancel","lostpointercapture","blur","keydown.enter","keydown.space","keyup"],["role","alert","aria-live","assertive",1,"video-setup__error"],["mat-button","","type","button",1,"video-setup__candidate"],["mat-button","","type","button",1,"video-setup__candidate",3,"click"],[1,"video-setup__candidate-name"],[1,"video-setup__chip"],["mat-stroked-button","","type","button",1,"video-setup__add",3,"click"],["matInput","","formControlName","name","placeholder","Foredeck"],[1,"video-setup__manual-row"],[1,"video-setup__manual-scheme"],["formControlName","scheme"],[1,"video-setup__manual-host"],["matInput","","formControlName","host","placeholder","192.168.1.50",3,"blur"],[1,"video-setup__manual-port"],["matInput","","type","number","formControlName","port","placeholder","554"],["matInput","","formControlName","path","placeholder","/stream1"],["matInput","","formControlName","username","autocomplete","off","aria-describedby","cred-note"],["matInput","","type","password","formControlName","password","autocomplete","new-password","aria-describedby","cred-note"],["id","cred-note",1,"video-setup__hint"],[1,"video-setup__manual-actions"],["diameter","18","mode","indeterminate"],["mat-flat-button","","type","button",1,"video-setup__add",3,"click","disabled"],["mat-button","","type","button"],["role","status","aria-live","polite",1,"video-setup__test",3,"video-setup__test--ok","video-setup__test--bad"],["role","status","aria-live","polite",1,"video-setup__cred-status"],["mat-button","","type","button",3,"click","disabled"],["mat-button","","type","button",3,"click"],["role","status","aria-live","polite",1,"video-setup__test"],["formControlName","fileAssetId"],["mat-icon-button","","type","button","matTooltip","Delete selected video","aria-label","Delete selected video",3,"click"],["type","file","accept","video/mp4,video/webm,video/quicktime,video/*","hidden","",3,"change"]],template:function(t,i){t&1&&(o(0,"div",1)(1,"section",2)(2,"h3",3),l(3,"Source"),a(),o(4,"mat-button-toggle-group",4)(5,"mat-button-toggle",5)(6,"mat-icon"),l(7,"videocam"),a(),o(8,"span",6),l(9,"Camera"),a()(),o(10,"mat-button-toggle",7)(11,"mat-icon"),l(12,"video_library"),a(),o(13,"span",6),l(14,"Uploaded"),a()(),o(15,"mat-button-toggle",8)(16,"mat-icon"),l(17,"link"),a(),o(18,"span",6),l(19,"URL"),a()()(),h(20,sp,8,0,"div",9),h(21,dp,20,0),h(22,Ap,36,8),h(23,Rp,23,4),a(),o(24,"section",2)(25,"h3",3),l(26,"Quality & Latency"),a(),o(27,"mat-button-toggle-group",10)(28,"mat-button-toggle",11)(29,"span",6),l(30,"Live"),a(),o(31,"small",12),l(32,"Lowest delay"),a()(),o(33,"mat-button-toggle",13)(34,"span",6),l(35,"Balanced"),a(),o(36,"small",12),l(37,"Everyday use"),a()(),o(38,"mat-button-toggle",14)(39,"span",6),l(40,"Best quality"),a(),o(41,"small",12),l(42,"Smoothest"),a()()(),o(43,"small",15),l(44),a()(),o(45,"section",2)(46,"h3",3),l(47,"Appearance"),a(),o(48,"mat-form-field",16)(49,"mat-label"),l(50,"Title (optional)"),a(),b(51,"input",17),o(52,"mat-hint"),l(53,"Shown above the video to tell streams apart when several are on screen."),a()(),o(54,"div",18)(55,"mat-form-field")(56,"mat-label"),l(57,"Picture size"),a(),o(58,"mat-select",19)(59,"mat-option",20),l(60,"Fit (show whole picture)"),a(),o(61,"mat-option",21),l(62,"Fill (crop to frame)"),a(),o(63,"mat-option",22),l(64,"Stretch (fills the box, may distort)"),a()()(),o(65,"div",23)(66,"mat-checkbox",24),l(67,"Muted"),a(),o(68,"mat-checkbox",25),l(69,"Autoplay"),a(),o(70,"mat-checkbox",26),l(71,"Loop"),a()()()(),o(72,"section",27)(73,"h3",3),l(74,"Snapshot"),a(),o(75,"div",28)(76,"mat-checkbox",29),l(77," Save the boat\u2019s location (GPS) in the photo "),a(),o(78,"small",30),l(79," Anyone you share or export the photo to can see where the boat was. "),a(),o(80,"mat-checkbox",31),l(81," Save other boat data in the photo (time, speed, heading, depth, wind\u2026) "),a(),o(82,"small",32),l(83," This data travels with the photo when it\u2019s shared or exported. "),a()(),o(84,"mat-form-field",33)(85,"mat-label"),l(86,"Snapshot button sends to"),a(),o(87,"mat-select",34)(88,"mat-option",35),l(89,"Download"),a(),o(90,"mat-option",36),l(91,"Share\u2026"),a(),o(92,"mat-option",37),l(93,"Save to Signal K (coming soon)"),a()()()()()),t&2&&(g("formGroup",i.videoGroup),d(20),f(i.pluginMissing?20:-1),d(),f(i.sourceKind==="url"?21:-1),d(),f(i.sourceKind==="camera"?22:-1),d(),f(i.sourceKind==="file"?23:-1),d(21),v(i.presetHint))},dependencies:[J,fe,wt,Q,ce,Fo,U,Re,Kt,he,te,Z,ot,gt,Te,ge,qe,Ee,ee,je,Ae,Mn,wn,Sn,se,Se,le,de,K,En,Tn,zo,Bo,rl,wa],styles:[".video-setup[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:22px}.video-setup__section[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:12px}.video-setup__label[_ngcontent-%COMP%]{margin:0;padding:0;font-size:.8rem;font-weight:inherit;letter-spacing:.04em;text-transform:uppercase;opacity:.6}.video-setup__sources[_ngcontent-%COMP%]{width:100%;border-radius:12px}.video-setup__sources[_ngcontent-%COMP%]   mat-button-toggle[_ngcontent-%COMP%]{flex:1 1 0}.video-setup__sources[_ngcontent-%COMP%]   .mat-button-toggle-label-content[_ngcontent-%COMP%]{display:flex;flex-direction:column;align-items:center;line-height:1.25;padding:8px 4px}.video-setup__sources[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{margin-bottom:2px}.video-setup__source-name[_ngcontent-%COMP%]{font-size:.85rem}.video-setup__soon[_ngcontent-%COMP%]{margin-left:6px;font-size:.72rem;color:var(--skip-contrast-dim-color)}.video-setup__url[_ngcontent-%COMP%]{width:100%;margin-top:4px}.video-setup__appearance[_ngcontent-%COMP%]{display:flex;flex-wrap:wrap;gap:16px 24px;align-items:flex-start}.video-setup__appearance[_ngcontent-%COMP%]   mat-form-field[_ngcontent-%COMP%]{flex:1 1 220px}.video-setup__toggles[_ngcontent-%COMP%]{display:flex;flex-wrap:wrap;gap:4px 20px;align-items:center}.video-setup__toggles--stacked[_ngcontent-%COMP%]{flex-direction:column;align-items:flex-start;gap:6px}.video-setup__hint[_ngcontent-%COMP%]{opacity:.6;margin:-2px 0 6px}.video-setup__camera-row[_ngcontent-%COMP%]{display:flex;align-items:center;gap:4px}.video-setup__camera-row[_ngcontent-%COMP%]   .video-setup__camera-pick[_ngcontent-%COMP%]{flex:1}.video-setup__off[_ngcontent-%COMP%]{color:var(--skip-contrast-dim-color)}.video-setup__enable[_ngcontent-%COMP%]{margin:2px 0 6px 2px;font-size:.85rem}.video-setup__ptz-test[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:4px;margin:2px 0 6px 2px}.video-setup__ptz-pad[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(3,40px);grid-template-rows:repeat(3,40px);justify-items:center;align-items:center;width:max-content}.video-setup__ptz-up[_ngcontent-%COMP%]{grid-column:2;grid-row:1}.video-setup__ptz-left[_ngcontent-%COMP%]{grid-column:1;grid-row:2}.video-setup__ptz-right[_ngcontent-%COMP%]{grid-column:3;grid-row:2}.video-setup__ptz-down[_ngcontent-%COMP%]{grid-column:2;grid-row:3}.video-setup__scan[_ngcontent-%COMP%]{display:flex;align-items:center;gap:8px;margin:4px 0}.video-setup__candidates[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:2px;margin-bottom:8px}.video-setup__candidate[_ngcontent-%COMP%]{justify-content:flex-start;text-align:left}.video-setup__candidate[_ngcontent-%COMP%]   small[_ngcontent-%COMP%]{margin-left:8px;opacity:.7}.video-setup__chip[_ngcontent-%COMP%]{margin-left:8px;padding:1px 6px;border-radius:8px;font-size:.68rem;letter-spacing:.04em;background:color-mix(in srgb,currentColor 14%,transparent)}.video-setup__manual[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:4px;padding:8px;border:0;margin:0;min-inline-size:auto;border-radius:8px;background:color-mix(in srgb,currentColor 6%,transparent)}.video-setup__manual-row[_ngcontent-%COMP%]{display:flex;gap:8px}.video-setup__manual-row[_ngcontent-%COMP%]   .video-setup__manual-scheme[_ngcontent-%COMP%]{width:160px}.video-setup__manual-row[_ngcontent-%COMP%]   .video-setup__manual-host[_ngcontent-%COMP%]{flex:1}.video-setup__manual-row[_ngcontent-%COMP%]   .video-setup__manual-port[_ngcontent-%COMP%]{width:90px}.video-setup__add[_ngcontent-%COMP%]{align-self:flex-start}.video-setup__error[_ngcontent-%COMP%]{color:var(--mat-sys-error, #b3261e)}.video-setup__plugin-banner[_ngcontent-%COMP%]{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:8px;font-size:.85rem;color:var(--skip-contrast-color);background:color-mix(in srgb,var(--skip-blue-color, #4aa3ff) 16%,transparent)}.video-setup__plugin-banner[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{flex:0 0 auto;font-size:20px;width:20px;height:20px;color:var(--skip-blue-color, #4aa3ff)}.video-setup__plugin-banner[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{flex:1}.video-setup__manual-actions[_ngcontent-%COMP%]{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.video-setup__test.video-setup__test--ok[_ngcontent-%COMP%]{color:var(--skip-zone-nominal-color, #43a047)}.video-setup__test.video-setup__test--bad[_ngcontent-%COMP%]{color:var(--skip-zone-alarm-color, #e53935)}.video-setup__cred-status[_ngcontent-%COMP%]{display:flex;align-items:center;gap:8px;font-size:.82rem;color:var(--skip-contrast-dim-color)}.video-setup__cred-status[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{flex:0 0 auto;font-size:18px;width:18px;height:18px}.video-setup__cred-status[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{flex:1}"]})}return n})();var gl=()=>["measuring","capacity"],Lp=()=>["marineCompass","baseplateCompass"],Vp=()=>["measuring"];function Gp(n,s){n&1&&b(0,"span",21)}function Bp(n,s){if(n&1&&(h(0,Gp,1,0,"span",21),l(1," Display ")),n&2){let e=u();f(e.formMaster.controls.datachartPath&&!e.formMaster.controls.datachartPath.valid?0:-1)}}function zp(n,s){if(n&1&&(o(0,"mat-checkbox",24),l(1," Blank the reading after 5s without data "),a()),n&2){let e=u(2);g("formControl",e.enableTimeoutToControl)}}function Up(n,s){if(n&1&&(o(0,"div",5)(1,"mat-form-field")(2,"mat-label"),l(3,"Display update interval"),a(),b(4,"input",22),o(5,"span",23),l(6,"ms"),a(),o(7,"mat-hint"),l(8,"How often the widget refreshes its reading on screen. Lower is more responsive but does more work; it does not change how often data is received."),a()(),h(9,zp,2,1,"mat-checkbox",24),a()),n&2){let e=u();d(4),g("formControl",e.updateIntervalToControl),d(5),f((e.widgetConfig==null?null:e.widgetConfig.enableTimeout)!==void 0?9:-1)}}function Wp(n,s){if(n&1&&(o(0,"div",25)(1,"div",26)(2,"mat-form-field",27)(3,"mat-label"),l(4,"Widget Label"),a(),b(5,"input",28),a()(),o(6,"div",26)(7,"mat-checkbox",29),l(8," Show Label "),a()()(),b(9,"config-graph-data-options",30)(10,"config-graph-display-options",31)),n&2){let e=u();d(9),g("filterSelfPaths",e.filterSelfPathsToControl)("datachartPath",e.datachartPathControl)("datachartSource",e.datachartSourceControl)("datachartAngleRange",e.datachartAngleRangeControl)("timeScale",e.timeScaleControl)("period",e.periodControl),d(),g("showDataPoints",e.showDataPointsToControl)("showAverageData",e.showAverageDataToControl)("trackAgainstAverage",e.trackAgainstAverageToControl)("datasetAverageArray",e.datasetAverageArrayToControl)("showDatasetMinimumValueLine",e.showDatasetMinimumValueLineToControl)("showDatasetMaximumValueLine",e.showDatasetMaximumValueLineToControl)("showDatasetAverageValueLine",e.showDatasetAverageValueLineToControl)("showDatasetAngleAverageValueLine",e.showDatasetAngleAverageValueLineToControl)("startScaleAtZero",e.startScaleAtZeroToControl)("showTimeScale",e.showTimeScaleToControl)("showYScale",e.showYScaleToControl)("yScaleSuggestedMin",e.yScaleSuggestedMinToControl)("yScaleSuggestedMax",e.yScaleSuggestedMaxToControl)("enableMinMaxScaleLimit",e.enableMinMaxScaleLimitToControl)("yScaleMin",e.yScaleMinToControl)("yScaleMax",e.yScaleMaxToControl)("numDecimal",e.numDecimalToControl)("timeScale",e.timeScaleControl)("period",e.periodControl)("verticalChart",e.verticalChartToControl)("inverseYAxis",e.inverseYAxisToControl)("color",e.colorToControl)}}function $p(n,s){n&1&&b(0,"select-autopilot",6)}function qp(n,s){n&1&&b(0,"video-camera-setup",7)}function Hp(n,s){n&1&&(o(0,"mat-form-field",33)(1,"mat-label"),l(2,"URL"),a(),b(3,"input",59),a())}function jp(n,s){n&1&&(o(0,"mat-checkbox",34),l(1," Allow pointer events on embedded content. WARNING: this may prevent swipe gestures over the Embed widget or keyboard events, while the focus is in the embed, from triggering normal Skip interactions. "),a())}function Kp(n,s){n&1&&(o(0,"div",60)(1,"div",26)(2,"mat-form-field",27)(3,"mat-label"),l(4,"Widget Label"),a(),b(5,"input",28),a()(),o(6,"div",26)(7,"mat-checkbox",29),l(8," Show Label "),a()()())}function Qp(n,s){n&1&&(o(0,"mat-form-field",33)(1,"mat-label"),l(2,"Widget Label"),a(),b(3,"input",28),a())}function Yp(n,s){if(n&1&&h(0,Kp,9,0,"div",60)(1,Qp,4,0,"mat-form-field",33),n&2){let e=u(2);f((e.widgetConfig==null?null:e.widgetConfig.showLabel)!==void 0?0:1)}}function Zp(n,s){n&1&&(o(0,"mat-form-field",61)(1,"mat-label"),l(2,"Scale Start"),a(),b(3,"input",62),a(),o(4,"mat-form-field",61)(5,"mat-label"),l(6,"Scale End"),a(),b(7,"input",63),a())}function Xp(n,s){n&1&&(o(0,"mat-form-field")(1,"mat-label"),l(2,"Integer Places"),a(),b(3,"input",64),a())}function Jp(n,s){if(n&1&&(o(0,"mat-form-field")(1,"mat-label"),l(2,"Decimal Places"),a(),b(3,"input",65),a()),n&2){let e=u(2);Ue(e.widgetConfig.showMiniChart!==void 0?"options-grid-span2":"")}}function eu(n,s){n&1&&(o(0,"mat-checkbox",36),l(1," Show Min recorded value "),a())}function tu(n,s){n&1&&(o(0,"mat-checkbox",37),l(1," Show Max recorded value "),a())}function iu(n,s){if(n&1&&(o(0,"mat-form-field")(1,"mat-label"),l(2,"Next Page after start"),a(),b(3,"input",66),a()),n&2){let e=u(2);G("options-grid-span2",!e.widgetConfig.numInt)}}function nu(n,s){n&1&&(o(0,"mat-checkbox",39),l(1," Enable beeps on count down "),a())}function au(n,s){if(n&1&&b(0,"display-datetime-options",40),n&2){let e=u(2);g("dateFormat",e.dateFormatToControl)("dateTimezone",e.dateTimezoneToControl)}}function ou(n,s){n&1&&(o(0,"mat-checkbox",41),l(1," Enable Advanced Compass Mode "),a())}function ru(n,s){n&1&&(o(0,"mat-checkbox",42),l(1," Close-hauled Lines "),a())}function lu(n,s){n&1&&(o(0,"mat-form-field")(1,"mat-label"),l(2,"Optimal Close-hauled Angle"),a(),b(3,"input",67),a())}function su(n,s){n&1&&(o(0,"mat-checkbox",43),l(1," Wind Sectors "),a())}function du(n,s){n&1&&(o(0,"mat-form-field")(1,"mat-label"),l(2,"Sector Duration (sec)"),a(),b(3,"input",68),a())}function cu(n,s){n&1&&(o(0,"mat-checkbox",44),l(1," Apparent Wind Speed Value "),a())}function mu(n,s){n&1&&(o(0,"mat-checkbox",45),l(1," True Wind Speed Value "),a())}function pu(n,s){n&1&&(o(0,"mat-checkbox",46),l(1," Course Over Ground "),a())}function uu(n,s){n&1&&(o(0,"mat-checkbox",47),l(1," True Wind Angle Indicator "),a())}function hu(n,s){n&1&&(o(0,"mat-checkbox",48),l(1," Next Waypoint "),a())}function fu(n,s){n&1&&(o(0,"mat-checkbox",49),l(1," Drift "),a())}function gu(n,s){n&1&&(o(0,"mat-checkbox",50),l(1," Rudder Angle "),a())}function _u(n,s){n&1&&(o(0,"mat-checkbox",51),l(1," Invert Rudder "),a())}function bu(n,s){n&1&&(o(0,"mat-form-field")(1,"mat-label"),l(2,"Minimum Value"),a(),b(3,"input",69),a())}function vu(n,s){n&1&&(o(0,"mat-form-field")(1,"mat-label"),l(2,"Maximum Value"),a(),b(3,"input",70),a())}function Cu(n,s){n&1&&(o(0,"mat-checkbox",52),l(1," Ignore Zones configuration "),a())}function yu(n,s){n&1&&(o(0,"div",71)(1,"mat-checkbox",72),l(2," Show Heeling Side Label "),a()(),o(3,"div",71)(4,"mat-checkbox",73),l(5," Reverse Angle "),a()())}function xu(n,s){n&1&&(o(0,"div",71)(1,"mat-checkbox",76),l(2," Show Progress Bar "),a()(),o(3,"div",53)(4,"mat-checkbox",77),l(5," Show Ticks "),a()())}function ku(n,s){n&1&&(o(0,"div",71)(1,"mat-checkbox",77),l(2," Show Ticks "),a()())}function wu(n,s){if(n&1&&(o(0,"mat-form-field",71)(1,"mat-label"),l(2,"Highlights Width"),a(),b(3,"input",74),a(),o(4,"div",71)(5,"mat-checkbox",75),l(6," Show Needle Indicator "),a()(),h(7,xu,6,0)(8,ku,3,0,"div",71)),n&2){let e=u(2);d(7),f((e.widgetConfig==null||e.widgetConfig.gauge==null?null:e.widgetConfig.gauge.type)==="ngRadial"?7:8)}}function Su(n,s){n&1&&(o(0,"mat-form-field",53)(1,"mat-label"),l(2,"Rotation Element"),a(),o(3,"mat-select",78)(4,"mat-option",79),l(5,"Dial (Marine Compass)"),a(),o(6,"mat-option",80),l(7,"Needle (Base plate compass)"),a()()(),o(8,"div",71)(9,"mat-checkbox",81),l(10," Show value box "),a()(),o(11,"div",71)(12,"mat-checkbox",82),l(13," Show cardinal degrees "),a()())}function Mu(n,s){n&1&&(o(0,"mat-form-field",71)(1,"mat-label"),l(2,"Progress Bar Start Position"),a(),o(3,"mat-select",85)(4,"mat-option",86),l(5,"Left"),a(),o(6,"mat-option",87),l(7,"Middle"),a(),o(8,"mat-option",88),l(9,"Right"),a()()())}function Tu(n,s){n&1&&(o(0,"mat-form-field",71)(1,"mat-label"),l(2,"Progress Bar Start Angle"),a(),b(3,"input",89),a())}function Eu(n,s){if(n&1&&(o(0,"mat-form-field",71)(1,"mat-label"),l(2,"Gauge Type"),a(),o(3,"mat-select",78)(4,"mat-option",83),l(5,"Measuring"),a(),o(6,"mat-option",84),l(7,"Capacity"),a()()(),h(8,Mu,10,0,"mat-form-field",71),h(9,Tu,4,0,"mat-form-field",71)),n&2){let e=u(3);d(8),f((e.widgetConfig==null||e.widgetConfig.gauge==null?null:e.widgetConfig.gauge.type)==="ngRadial"&&Oi(2,Vp).includes(e.formMaster.value.gauge.subType)?8:-1),d(),f(e.formMaster.value.gauge.subType==="capacity"?9:-1)}}function Iu(n,s){if(n&1&&h(0,Su,14,0)(1,Eu,10,3),n&2){let e=u(2);f(Oi(1,Lp).indexOf(e.formMaster.value.gauge.subType)>-1?0:Oi(2,gl).indexOf(e.formMaster.value.gauge.subType)>-1?1:-1)}}function Au(n,s){n&1&&(o(0,"mat-form-field",53)(1,"mat-label"),l(2,"Orientation"),a(),o(3,"mat-select",90)(4,"mat-option",91),l(5,"Vertical"),a(),o(6,"mat-option",92),l(7,"Horizontal"),a()()())}function Du(n,s){n&1&&(o(0,"mat-form-field",53)(1,"mat-label"),l(2,"Unit Label"),a(),o(3,"mat-select",93)(4,"mat-option",94),l(5,"Full Label"),a(),o(6,"mat-option",95),l(7,"First Letter Only"),a()()())}function Pu(n,s){if(n&1&&(o(0,"mat-option",97),l(1),a()),n&2){let e=s.$implicit;g("value",It(e.value)),d(),v(e.label)}}function Ou(n,s){if(n&1&&(o(0,"mat-form-field",33)(1,"mat-label"),l(2,"Color"),a(),o(3,"mat-select",96),I(4,Pu,2,3,"mat-option",97,oe),a()()),n&2){let e=u(2);d(4),A(e.colors)}}function Fu(n,s){n&1&&(o(0,"mat-form-field",33)(1,"mat-label"),l(2,"Scale Span"),a(),o(3,"mat-select",98)(4,"mat-option",99),l(5,"1 Minute"),a(),o(6,"mat-option",100),l(7,"5 Minutes"),a(),o(8,"mat-option",101),l(9,"30 Minutes"),a()()(),o(10,"div",102)(11,"strong"),l(12,"History API:"),a(),l(13," Wind Trends can be pre-filled with historical data from the Signal K History API. "),o(14,"a",103),l(15,"Learn more"),a()())}function Ru(n,s){n&1&&(o(0,"mat-checkbox",54),l(1," Show Background Graph "),o(2,"i"),l(3,"(Too many graphs may affect performance)"),a()())}function Nu(n,s){n&1&&(o(0,"mat-form-field")(1,"mat-label"),l(2,"Suggested Scale Start"),a(),b(3,"input",104),a())}function Lu(n,s){n&1&&(o(0,"mat-form-field")(1,"mat-label"),l(2,"Suggested Scale End"),a(),b(3,"input",105),a())}function Vu(n,s){n&1&&(o(0,"mat-checkbox",55),l(1," Inverse Scale Axis "),a())}function Gu(n,s){n&1&&(o(0,"mat-checkbox",56),l(1," Vertical Data Graph "),a())}function Bu(n,s){n&1&&(o(0,"mat-checkbox",57),l(1," Disable background color "),a())}function zu(n,s){if(n&1&&(o(0,"mat-option",97),l(1),a()),n&2){let e=s.$implicit;g("value",It(e.value)),d(),v(e.label)}}function Uu(n,s){if(n&1&&(o(0,"mat-form-field")(1,"mat-label"),l(2,"Background Color"),a(),o(3,"mat-select",106),I(4,zu,2,3,"mat-option",97,oe),a()()),n&2){let e=u(2);d(4),A(e.colors)}}function Wu(n,s){n&1&&(en(0,58),o(1,"mat-form-field")(2,"mat-label"),l(3,"View Mode"),a(),o(4,"mat-select",107)(5,"mat-option",108),l(6,"North Up"),a(),o(7,"mat-option",109),l(8,"Course Up"),a()()(),o(9,"mat-form-field")(10,"mat-label"),l(11,"Fully Visible Rings Range"),a(),o(12,"mat-select",110)(13,"mat-option",111),l(14,"1 miles"),a(),o(15,"mat-option",112),l(16,"3 miles"),a(),o(17,"mat-option",113),l(18,"6 miles"),a(),o(19,"mat-option",114),l(20,"12 miles"),a(),o(21,"mat-option",115),l(22,"24 miles"),a(),o(23,"mat-option",116),l(24,"48 miles"),a()()(),o(25,"mat-checkbox",117),l(26," Plot target COG vector "),a(),o(27,"mat-form-field")(28,"mat-label"),l(29,"COG plot length (minutes)"),a(),b(30,"input",118),a(),o(31,"mat-checkbox",119),l(32," Show unconfirmed targets "),a(),o(33,"mat-checkbox",120),l(34," Show lost targets "),a(),o(35,"mat-checkbox",121),l(36," Show own ship icon "),a(),tn())}function $u(n,s){n&1&&(o(0,"mat-form-field",71)(1,"mat-label"),l(2,"Background Style"),a(),o(3,"mat-select",134)(4,"mat-option",135),l(5,"Dark Gray"),a(),o(6,"mat-option",136),l(7,"Satin Gray"),a(),o(8,"mat-option",137),l(9,"Light Gray"),a(),o(10,"mat-option",138),l(11,"White"),a(),o(12,"mat-option",139),l(13,"Black"),a(),o(14,"mat-option",140),l(15,"Beige"),a(),o(16,"mat-option",141),l(17,"Brown"),a(),o(18,"mat-option",142),l(19,"Red"),a(),o(20,"mat-option",143),l(21,"Green"),a(),o(22,"mat-option",144),l(23,"Blue"),a(),o(24,"mat-option",130),l(25,"Anthracite"),a(),o(26,"mat-option",145),l(27,"Mud"),a(),o(28,"mat-option",146),l(29,"Punched Sheet"),a(),o(30,"mat-option",147),l(31,"Carbon"),a(),o(32,"mat-option",148),l(33,"Stainless"),a(),o(34,"mat-option",149),l(35,"Brushed Metal"),a(),o(36,"mat-option",150),l(37,"Brushed Stainless"),a(),o(38,"mat-option",151),l(39,"Turned"),a()()())}function qu(n,s){n&1&&(o(0,"div",71)(1,"mat-checkbox",152),l(2," Reverse Pitch Axis "),a()(),o(3,"div",71)(4,"mat-checkbox",153),l(5," Reverse Roll Axis "),a()(),o(6,"div",71)(7,"mat-checkbox",154),l(8," Show Frame "),a()())}function Hu(n,s){if(n&1&&(h(0,$u,40,0,"mat-form-field",71),h(1,qu,9,0),o(2,"mat-form-field",71)(3,"mat-label"),l(4,"Frame Style"),a(),o(5,"mat-select",122)(6,"mat-option",123),l(7,"Black Metal"),a(),o(8,"mat-option",124),l(9,"Metal"),a(),o(10,"mat-option",125),l(11,"Shiny Metal"),a(),o(12,"mat-option",126),l(13,"Brass"),a(),o(14,"mat-option",127),l(15,"Steel"),a(),o(16,"mat-option",128),l(17,"Chrome"),a(),o(18,"mat-option",129),l(19,"Gold"),a(),o(20,"mat-option",130),l(21,"Anthracite"),a(),o(22,"mat-option",131),l(23,"Tilted Gray"),a(),o(24,"mat-option",132),l(25,"Tilted Black"),a(),o(26,"mat-option",133),l(27,"Glossy Metal"),a()()()),n&2){let e=u(2);f((e.widgetConfig==null||e.widgetConfig.gauge==null?null:e.widgetConfig.gauge.type)!=="horizon"?0:-1),d(),f((e.widgetConfig==null||e.widgetConfig.gauge==null?null:e.widgetConfig.gauge.type)==="horizon"?1:-1)}}function ju(n,s){if(n&1&&(o(0,"div",5)(1,"div",32),h(2,Hp,4,0,"mat-form-field",33),h(3,jp,2,0,"mat-checkbox",34),h(4,Yp,2,1),h(5,Zp,8,0),h(6,Xp,4,0,"mat-form-field"),h(7,Jp,4,2,"mat-form-field",35),h(8,eu,2,0,"mat-checkbox",36),h(9,tu,2,0,"mat-checkbox",37),h(10,iu,4,2,"mat-form-field",38),h(11,nu,2,0,"mat-checkbox",39),h(12,au,1,2,"display-datetime-options",40),h(13,ou,2,0,"mat-checkbox",41),h(14,ru,2,0,"mat-checkbox",42),h(15,lu,4,0,"mat-form-field"),h(16,su,2,0,"mat-checkbox",43),h(17,du,4,0,"mat-form-field"),h(18,cu,2,0,"mat-checkbox",44),h(19,mu,2,0,"mat-checkbox",45),h(20,pu,2,0,"mat-checkbox",46),h(21,uu,2,0,"mat-checkbox",47),h(22,hu,2,0,"mat-checkbox",48),h(23,fu,2,0,"mat-checkbox",49),h(24,gu,2,0,"mat-checkbox",50),h(25,_u,2,0,"mat-checkbox",51),h(26,bu,4,0,"mat-form-field"),h(27,vu,4,0,"mat-form-field"),h(28,Cu,2,0,"mat-checkbox",52),h(29,yu,6,0),h(30,wu,9,1),h(31,Iu,2,3),h(32,Au,8,0,"mat-form-field",53),h(33,Du,8,0,"mat-form-field",53),h(34,Ou,6,0,"mat-form-field",33),h(35,Fu,16,0),h(36,Ru,4,0,"mat-checkbox",54),h(37,Nu,4,0,"mat-form-field"),h(38,Lu,4,0,"mat-form-field"),h(39,Vu,2,0,"mat-checkbox",55),h(40,Gu,2,0,"mat-checkbox",56),h(41,Bu,2,0,"mat-checkbox",57),h(42,Uu,6,0,"mat-form-field"),h(43,Wu,37,0,"ng-container",58),h(44,Hu,28,2),a()()),n&2){let e=u();d(2),f((e.widgetConfig==null?null:e.widgetConfig.widgetUrl)!==void 0?2:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.allowInput)!==void 0?3:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.displayName)!==void 0?4:-1),d(),f(e.formMaster.get("displayScale")?5:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.numInt)!==void 0?6:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.numDecimal)!==void 0?7:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.showMin)!==void 0?8:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.showMax)!==void 0?9:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.nextDashboard)!==void 0?10:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.playBeeps)!==void 0?11:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.dateFormat)!==void 0?12:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.compassModeEnabled)!==void 0?13:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.laylineEnable)!==void 0?14:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.laylineEnable)!==void 0?15:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.windSectorEnable)!==void 0?16:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.windSectorEnable)!==void 0?17:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.awsEnable)!==void 0?18:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.twsEnable)!==void 0?19:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.courseOverGroundEnable)!==void 0?20:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.twaEnable)!==void 0?21:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.waypointEnable)!==void 0?22:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.driftEnable)!==void 0?23:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.rudderEnable)!==void 0?24:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.invertRudder)!==void 0?25:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.minValue)!==void 0&&!e.formMaster.get("displayScale")?26:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.maxValue)!==void 0&&!e.formMaster.get("displayScale")?27:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.ignoreZones)!==void 0?28:-1),d(),f((e.widgetConfig==null||e.widgetConfig.gauge==null?null:e.widgetConfig.gauge.type)==="angle"?29:-1),d(),f((e.widgetConfig==null||e.widgetConfig.gauge==null?null:e.widgetConfig.gauge.type)==="ngRadial"&&Oi(43,gl).includes(e.formMaster.value.gauge.subType)||(e.widgetConfig==null||e.widgetConfig.gauge==null?null:e.widgetConfig.gauge.type)==="ngLinear"?30:-1),d(),f((e.widgetConfig==null||e.widgetConfig.gauge==null?null:e.widgetConfig.gauge.type)==="ngRadial"?31:-1),d(),f((e.widgetConfig==null||e.widgetConfig.gauge==null?null:e.widgetConfig.gauge.type)==="ngLinear"?32:-1),d(),f((e.widgetConfig==null||e.widgetConfig.gauge==null?null:e.widgetConfig.gauge.type)==="simpleLinear"?33:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.color)!==void 0?34:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.timeScale)!==void 0?35:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.showMiniChart)!==void 0?36:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.yScaleMin)!==void 0?37:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.yScaleMax)!==void 0?38:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.inverseYAxis)!==void 0?39:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.verticalChart)!==void 0?40:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.noBgColor)!==void 0?41:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.bgColor)!==void 0?42:-1),d(),f((e.widgetConfig==null?null:e.widgetConfig.ais)!==void 0?43:-1),d(),f((e.widgetConfig==null||e.widgetConfig.gauge==null?null:e.widgetConfig.gauge.type)==="steel"||(e.widgetConfig==null||e.widgetConfig.gauge==null?null:e.widgetConfig.gauge.type)==="horizon"?44:-1)}}function Ku(n,s){n&1&&(o(0,"mat-tab",8),b(1,"ais-target-options",58),a())}function Qu(n,s){if(n&1&&(o(0,"span",157),l(1," error "),a(),l(2,"\xA0Controls ")),n&2){let e=u(2);ai(e.formMaster.controls.multiChildCtrls.valid?"display: none":"display: block")}}function Yu(n,s){if(n&1){let e=P();o(0,"mat-tab",9)(1,"div",155)(2,"div"),ze(3,Qu,3,2,"ng-template",4),a(),o(4,"boolean-multicontrol-options",156),C("addPath",function(i){y(e);let r=u();return x(r.addPathGroup(i))})("updatePath",function(i){y(e);let r=u();return x(r.updatePath(i))})("delPath",function(i){y(e);let r=u();return x(r.deletePath(i))}),a()()()}if(n&2){let e=u();d(4),g("multiCtrlArray",e.multiChildCtrlsToControl)("zonesOnlyPaths",(e.widgetConfig==null?null:e.widgetConfig.zonesOnlyPaths)??!1)}}function Zu(n,s){if(n&1&&(o(0,"span",157),l(1," error "),a(),l(2," \xA0Paths ")),n&2){let e=u(2);ai(e.formMaster.controls.paths.valid||e.formMaster.controls.paths.disabled?"display: none":"display: block")}}function Xu(n,s){if(n&1&&(o(0,"mat-tab",10)(1,"div",155)(2,"div"),ze(3,Zu,3,2,"ng-template",4),a(),b(4,"paths-options",158),a()()),n&2){let e=u();d(4),g("isArray",e.isPathArray)("filterSelfPaths",e.filterSelfPathsToControl)("addPathEvent",e.addPathEvent)("delPathEvent",e.delPathEvent)("updatePathEvent",e.updatePathEvent)}}function Ju(n,s){n&1&&(o(0,"p")(1,"mat-checkbox",161),l(2," Digital display "),a()())}function eh(n,s){n&1&&(o(0,"mat-form-field",33)(1,"mat-label"),l(2,"Dial Size"),a(),o(3,"mat-select",162)(4,"mat-option",163),l(5,"1/4"),a(),o(6,"mat-option",164),l(7,"1/2"),a(),o(8,"mat-option",165),l(9,"3/4"),a(),o(10,"mat-option",94),l(11,"Full"),a()()())}function th(n,s){if(n&1&&(o(0,"mat-tab",11)(1,"div",5)(2,"mat-form-field",33)(3,"mat-label"),l(4,"Gauge Type"),a(),o(5,"mat-select",90)(6,"mat-option",159),l(7,"Linear"),a(),o(8,"mat-option",160),l(9,"Radial"),a()()(),h(10,Ju,3,0,"p"),h(11,eh,12,0,"mat-form-field",33),a()()),n&2){let e=u();d(10),f(e.formMaster.value.gauge.subType==="linear"?10:-1),d(),f(e.formMaster.value.gauge.subType==="radial"?11:-1)}}function ih(n,s){n&1&&(o(0,"p")(1,"mat-checkbox",168),l(2," Value to send on button push (checked = on, unchecked = off) "),a()())}function nh(n,s){if(n&1&&(o(0,"mat-tab",12)(1,"div",155)(2,"p")(3,"mat-checkbox",166),l(4," Enable Put Requests "),a()(),o(5,"p")(6,"mat-checkbox",167),l(7," Momentary mode (instead of switching between on/off) "),a()(),h(8,ih,3,0,"p"),a()()),n&2){let e=u();d(8),f(e.formMaster.controls.putMomentary.value?8:-1)}}function ah(n,s){n&1&&(o(0,"mat-tab",13),b(1,"bms-bank-setup",169),a())}function oh(n,s){if(n&1&&(o(0,"span",157),l(1," error "),a(),l(2,"\xA0Solar Chargers ")),n&2){let e=u(2);ai(e.formMaster.controls.solarCharger.valid?"display: none":"display: block")}}function rh(n,s){n&1&&(o(0,"mat-tab",14)(1,"div",155)(2,"div"),ze(3,oh,3,2,"ng-template",4),a(),b(4,"solar-charger-setup",170),a()())}function lh(n,s){n&1&&(o(0,"mat-tab",15),b(1,"electrical-family-setup",171),a())}function sh(n,s){n&1&&(o(0,"mat-tab",16),b(1,"electrical-family-setup",172),a())}function dh(n,s){n&1&&(o(0,"mat-tab",17),b(1,"electrical-family-setup",173),a())}function ch(n,s){n&1&&(o(0,"mat-tab",18),b(1,"electrical-family-setup",174),a())}var _l=(()=>{class n{static KEY_MULTI_CHILD_CTRLS="multiChildCtrls";static KEY_DISPLAY_SCALE="displayScale";static KEY_GAUGE="gauge";static KEY_AUTOPILOT="autopilot";static KEY_PATHS="paths";static KEY_AIS="ais";static KEY_CONVERT_UNIT_TO="convertUnitTo";dialogRef=m(Ct);fb=m(Yt);app=m(xi);destroyRef=m(be);widgetConfig=m(dt);titleDialog=this.widgetConfig?.widgetName?`${this.widgetConfig.widgetName} \u2014 Widget Settings`:"Widget Settings";formMaster;isPathArray=!1;addPathEvent;delPathEvent;updatePathEvent;colors=[];saveDisabled=T(!0);ngOnInit(){if(!this.widgetConfig){console.error("Widget configuration data is missing. Closing dialog."),this.dialogRef.close();return}let e=R({},this.widgetConfig);delete e.widgetName,this.formMaster=this.generateFormGroups(e),this.setupWindsteerControlState(),this.formMaster.statusChanges.pipe(q(this.destroyRef)).subscribe(()=>this.saveDisabled.set(this.formMaster.invalid)),queueMicrotask(()=>this.saveDisabled.set(this.formMaster.invalid)),this.colors=this.app.configurableThemeColors}configControl(e){return this.formMaster.get(e)}setupWindsteerControlState(){let e=this.configControl("compassModeEnabled"),t=this.configControl("courseOverGroundEnable"),i=this.configControl("waypointEnable"),r=this.configControl("driftEnable");if(!e||!t||!i||!r)return;let c=p=>{if(p===!0){t.enable({emitEvent:!1}),i.enable({emitEvent:!1}),r.enable({emitEvent:!1});return}t.disable({emitEvent:!1}),i.disable({emitEvent:!1}),r.disable({emitEvent:!1})};c(e.value),e.valueChanges.pipe(q(this.destroyRef)).subscribe(p=>c(p))}isPlainObject(e){return Object.prototype.toString.call(e)==="[object Object]"}generateFormGroups(e,t){let i=this.fb.group({});return Object.keys(e).forEach(r=>{let c=e[r];if(c!==null&&(Array.isArray(c)||this.isPlainObject(c)))if(r===n.KEY_MULTI_CHILD_CTRLS){i.addControl(r,this.fb.array([]));let p=i.get(r);c.forEach(_=>{p.push(this.generateCtrlArray(_))})}else if(r===n.KEY_DISPLAY_SCALE)i.addControl(r,this.generateFormGroups(c,r));else if(r===n.KEY_GAUGE)i.addControl(r,this.generateFormGroups(c,r));else if(r===n.KEY_AUTOPILOT)i.addControl(r,this.generateFormGroups(c,r));else if(r===n.KEY_AIS)i.addControl(r,this.generateFormGroups(c,r));else if(r===n.KEY_PATHS){let p=c;if(this.widgetConfig.multiChildCtrls!==void 0){this.isPathArray=!0,i.addControl(r,this.fb.array([]));let _=i.get(r);Object.keys(p).forEach(k=>{let w=p[k];if(w){let M=this.generatePathArray(k,w);w.isPathConfigurable===!1&&M.disable(),_.push(M)}})}else{let _=this.fb.group({});Object.keys(p).forEach(k=>{let w=p[k];if(w){let M=this.generateFormGroups(w,k),ie=(w.pathOptions?.length??0)>0;w.isPathConfigurable===!1&&!ie&&M.get("path")?.disable(),_.addControl(k,M)}}),i.addControl(r,_)}}else Array.isArray(c)?i.addControl(r,new L(c)):i.addControl(r,this.generateFormGroups(c,r));else if(t===n.KEY_CONVERT_UNIT_TO){let p=e[r];p&&p.pathType=="number"&&i.addControl(r,new L(c))}else switch(r){case"path":i.addControl(r,new L(c));break;case"updateInterval":i.addControl(r,new L(c,[z.required,z.min(100)]));break;default:i.addControl(r,new L(c));break}}),i}generatePathArray(e,t){let i=new Ve({});return Object.keys(t).forEach(r=>{i.addControl(r,this.generatePathFields(r,t[r]))}),i}generatePathFields(e,t){switch(e){case"path":return new gi(t);case"source":return new gi(t,z.required);default:return new gi(t)}}generateCtrlArray(e){let t=this.fb.group(e);return t.controls.ctrlLabel.addValidators(z.required),t}addPathGroup(e){this.addPathEvent=e}updatePath(e){e.forEach(t=>{this.configControl("paths").controls.forEach(r=>{r.get("pathID").value==t.pathID&&(r.controls.description.setValue(t.ctrlLabel),r.controls.pathType.setValue(t.isNumeric?"number":"boolean"),this.updatePathEvent=e)})})}deletePath(e){let t=this.configControl("paths"),i=0;t.controls.forEach(c=>{c.get("pathID").value==e.pathID?t.removeAt(i):i++}),this.configControl("multiChildCtrls").removeAt(e.ctrlIndex),this.delPathEvent=e.pathID,this.formMaster.updateValueAndValidity()}get datachartPathControl(){return this.configControl("datachartPath")}get datachartSourceControl(){return this.configControl("datachartSource")}get datachartAngleRangeControl(){return this.configControl("datachartAngleRange")}get timeScaleControl(){return this.configControl("timeScale")}get periodControl(){return this.configControl("period")}get filterSelfPathsToControl(){return this.configControl("filterSelfPaths")}get hasConfigurablePaths(){if(this.widgetConfig?.multiChildCtrls!==void 0)return!0;let e=Object.values(this.widgetConfig?.paths??{});return e.length===0?!1:e.some(t=>t?.isPathConfigurable!==!1||(t?.pathOptions?.length??0)>0)}get updateIntervalToControl(){return this.configControl("updateInterval")}get enableTimeoutToControl(){return this.configControl("enableTimeout")}get dateTimezoneToControl(){return this.configControl("dateTimezone")}get yScaleSuggestedMaxToControl(){return this.configControl("yScaleSuggestedMax")}get enableMinMaxScaleLimitToControl(){return this.configControl("enableMinMaxScaleLimit")}get showDatasetMinimumValueLineToControl(){return this.configControl("showDatasetMinimumValueLine")}get showDatasetMaximumValueLineToControl(){return this.configControl("showDatasetMaximumValueLine")}get showDatasetAverageValueLineToControl(){return this.configControl("showDatasetAverageValueLine")}get showDatasetAngleAverageValueLineToControl(){return this.configControl("showDatasetAngleAverageValueLine")}get startScaleAtZeroToControl(){return this.configControl("startScaleAtZero")}get showTimeScaleToControl(){return this.configControl("showTimeScale")}get showYScaleToControl(){return this.configControl("showYScale")}get yScaleSuggestedMinToControl(){return this.configControl("yScaleSuggestedMin")}get yScaleMinToControl(){return this.configControl("yScaleMin")}get yScaleMaxToControl(){return this.configControl("yScaleMax")}get datasetAverageArrayToControl(){return this.configControl("datasetAverageArray")}get trackAgainstAverageToControl(){return this.configControl("trackAgainstAverage")}get showDataPointsToControl(){return this.configControl("showDataPoints")}get showAverageDataToControl(){return this.configControl("showAverageData")}get numDecimalToControl(){return this.configControl("numDecimal")}get verticalChartToControl(){return this.configControl("verticalChart")}get inverseYAxisToControl(){return this.configControl("inverseYAxis")}get colorToControl(){return this.configControl("color")}get dateFormatToControl(){return this.configControl("dateFormat")}get multiChildCtrlsToControl(){return this.configControl("multiChildCtrls")}submitConfig(){let e=this.formMaster.getRawValue();this.normalizeElectricalTrackedDevices(e),this.dialogRef.close(e)}normalizeElectricalTrackedDevices(e){[e.charger,e.inverter,e.alternator,e.ac,e.solarCharger,e.bms].forEach(i=>{if(!i)return;let r=Array.isArray(i.trackedDevices)?i.trackedDevices:[],c=new Map;r.forEach(p=>{if(!p||typeof p!="object")return;let _=p,k=typeof _.id=="string"?_.id.trim():"",w=typeof _.source=="string"?_.source.trim():"default";if(!k||!w)return;let M=typeof _.key=="string"&&_.key.trim().length>0?_.key.trim():`${k}||${w}`;c.set(M,{id:k,source:w,key:M})}),i.trackedDevices=[...c.values()].sort((p,_)=>p.key.localeCompare(_.key))})}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["modal-widget-config"]],decls:29,vars:16,consts:[[3,"ngSubmit","formGroup"],["mat-dialog-title",""],[1,"widget-config-dialog-content"],[1,"tab-group-content"],["mat-tab-label",""],[1,"display-content","tab-content"],["formGroupName","autopilot",1,"tab-content"],["formGroupName","video",1,"tab-content"],["label","Filter"],["label","Controls"],["label","Paths"],["label","Settings","formGroupName","gauge"],["label","Put Request"],["label","BMS"],["label","Solar Chargers"],["label","Chargers"],["label","Inverters"],["label","Alternators"],["label","AC"],["type","button","mat-dialog-close","","mat-flat-button",""],["mat-flat-button","","type","submit",3,"disabled"],[1,"warning","fa","fa-exclamation-circle"],["type","number","matNativeControl","","placeholder","Interval in milliseconds...","name","updateInterval","min","100","required","",3,"formControl"],["matTextSuffix",""],["name","enableTimeout",3,"formControl"],[1,"flex-container"],[1,"panel-group"],[1,"full-width"],["matInput","","placeholder","Enter a label to display","name","displayName","formControlName","displayName"],["name","showLabel","formControlName","showLabel",1,"full-width"],[1,"tab-content",3,"filterSelfPaths","datachartPath","datachartSource","datachartAngleRange","timeScale","period"],[1,"tab-content",3,"showDataPoints","showAverageData","trackAgainstAverage","datasetAverageArray","showDatasetMinimumValueLine","showDatasetMaximumValueLine","showDatasetAverageValueLine","showDatasetAngleAverageValueLine","startScaleAtZero","showTimeScale","showYScale","yScaleSuggestedMin","yScaleSuggestedMax","enableMinMaxScaleLimit","yScaleMin","yScaleMax","numDecimal","timeScale","period","verticalChart","inverseYAxis","color"],[1,"widget-options-grid"],[1,"options-grid-span2"],["name","allowInput","formControlName","allowInput",1,"options-grid-span2"],[3,"class"],["name","showMin","formControlName","showMin"],["name","showMax","formControlName","showMax"],[3,"options-grid-span2"],["name","playBeeps","formControlName","playBeeps"],[1,"options-grid-span2",3,"dateFormat","dateTimezone"],["name","compassModeEnabled","formControlName","compassModeEnabled",1,"fields","options-grid-span2"],["name","laylineEnable","formControlName","laylineEnable",1,"fields"],["name","windSectorEnable","formControlName","windSectorEnable"],["name","awsEnable","formControlName","awsEnable"],["name","twsEnable","formControlName","twsEnable"],["name","courseOverGroundEnable","formControlName","courseOverGroundEnable"],["name","twaEnable","formControlName","twaEnable"],["name","waypointEnable","formControlName","waypointEnable"],["name","driftEnable","formControlName","driftEnable"],["name","rudderEnable","formControlName","rudderEnable"],["name","invertRudder","formControlName","invertRudder"],["name","ignoreZones","formControlName","ignoreZones"],["formGroupName","gauge",1,"options-grid-span2"],["name","showMiniChart","formControlName","showMiniChart",1,"options-grid-span2"],["name","inverseYAxis","formControlName","inverseYAxis"],["name","verticalChart","formControlName","verticalChart"],["name","noBgColor","formControlName","noBgColor"],["formGroupName","ais"],["type","url","matInput","","placeholder","Enter URL to page/resource","name","widgetUrl","formControlName","widgetUrl"],[1,"flex-container","options-grid-span2"],["formGroupName","displayScale","appearance","outline"],["matNativeControl","","type","number","name","lower","formControlName","lower","placeholder","Enter number..."],["matInput","","type","number","name","upper","formControlName","upper","placeholder","Enter number..."],["type","number","min","1","max","5","matInput","","placeholder","Enter or select number...","name","numInt","formControlName","numInt","required",""],["type","number","min","0","max","5","matInput","","placeholder","Enter or select number...","name","numDecimal","formControlName","numDecimal","required",""],["type","number","min","0","max","99","matInput","","placeholder","Enter or select number...","name","nextDashboard","formControlName","nextDashboard"],["type","number","min","10","max","90","matInput","","placeholder","Select angle...","name","laylineAngle","formControlName","laylineAngle"],["type","number","min","1","max","90","matInput","","placeholder","Select or enter duration...","name","windSectorWindowSeconds","formControlName","windSectorWindowSeconds"],["matInput","","type","number","name","minValue","formControlName","minValue","placeholder","Enter or select number..."],["matInput","","type","number","name","maxValue","formControlName","maxValue","placeholder","Enter or select number..."],["formGroupName","gauge"],["name","sideLabel","formControlName","sideLabel"],["name","invertAngle","formControlName","invertAngle"],["type","number","min","0","max","25","matInput","","placeholder","Enter or select number...","name","highlightsWidth","formControlName","highlightsWidth","required",""],["name","enableNeedle","formControlName","enableNeedle"],["name","enableProgressbar","formControlName","enableProgressbar"],["name","enableTicks","formControlName","enableTicks"],["placeholder","Select Gauge Type...","formControlName","subType","name","subType"],["value","marineCompass"],["value","baseplateCompass"],["name","showValueBox","formControlName","showValueBox"],["name","compassUseNumbers","formControlName","compassUseNumbers"],["value","measuring"],["value","capacity"],["placeholder","Select start position...","formControlName","barStartPosition","name","barStartPosition"],["value","left"],["value","middle"],["value","right"],["type","number","min","1","max","360","matInput","","placeholder","Enter or select number...","name","scaleStart","formControlName","scaleStart","required",""],["placeholder","Select type...","formControlName","subType","name","subType"],["value","vertical"],["value","horizontal"],["placeholder","Select label format","formControlName","unitLabelFormat","name","unitLabelFormat"],["value","full"],["value","abr"],["placeholder","Select Color...","formControlName","color","name","color","required",""],[3,"value"],["placeholder","Select span duration...","formControlName","timeScale","name","timeScale","required",""],["value","Last Minute"],["value","Last 5 Minutes"],["value","Last 30 Minutes"],[2,"grid-column","1 / -1","font-size","0.9em","color","var(--mat-sys-outline)"],["routerLink","/help",2,"color","var(--skip-blue-color)","cursor","pointer","text-decoration","underline"],["type","number","matInput","","placeholder","Enter or select number...","name","yScaleMin","formControlName","yScaleMin","required",""],["type","number","matInput","","placeholder","Enter or select number...","name","yScaleMax","formControlName","yScaleMax","required",""],["placeholder","Select Color...","formControlName","bgColor","name","bgColor","required",""],["placeholder","Select view mode...","formControlName","viewMode","name","viewMode","required",""],["value","north-up"],["value","course-up"],["placeholder","Select AIS range...","formControlName","rangeIndex","name","rangeIndex","required",""],["value","0"],["value","1"],["value","2"],["value","3"],["value","4"],["value","5"],["name","showCogVectors","formControlName","showCogVectors"],["type","number","min","1","max","120","matInput","","placeholder","Enter or select duration...","name","cogVectorsMinutes","formControlName","cogVectorsMinutes"],["name","showUnconfirmedTargets","formControlName","showUnconfirmedTargets"],["name","showLostTargets","formControlName","showLostTargets"],["name","showSelf","formControlName","showSelf"],["placeholder","Select style...","formControlName","faceColor","name","faceColor"],["value","blackMetal"],["value","metal"],["value","shinyMetal"],["value","brass"],["value","steel"],["value","chrome"],["value","gold"],["value","anthracite"],["value","tiltedGray"],["value","tiltedBlack"],["value","glossyMetal"],["placeholder","Select style...","formControlName","backgroundColor","name","backgroundColor"],["value","darkGray"],["value","satinGray"],["value","lightGray"],["value","white"],["value","black"],["value","beige"],["value","brown"],["value","red"],["value","green"],["value","blue"],["value","mud"],["value","punchedSheet"],["value","carbon"],["value","stainless"],["value","brushedMetal"],["value","brushedStainless"],["value","turned"],["name","invertPitch","formControlName","invertPitch"],["name","invertRoll","formControlName","invertRoll"],["name","noFrameVisible","formControlName","noFrameVisible"],[1,"tab-content"],[3,"addPath","updatePath","delPath","multiCtrlArray","zonesOnlyPaths"],[1,"warning","material-icons"],["formGroupName","paths",3,"isArray","filterSelfPaths","addPathEvent","delPathEvent","updatePathEvent"],["value","linear"],["value","radial"],["formControlName","digitalMeter","name","digitalMeter"],["placeholder","Select size...","formControlName","radialSize","name","radialSize"],["value","quarter"],["value","half"],["value","three-quarter"],["formControlName","putEnable","name","putEnable"],["formControlName","putMomentary","name","putMomentary"],["formControlName","putMomentaryValue","name","putMomentaryValue"],["formGroupName","bms",1,"tab-content"],["formGroupName","solarCharger",1,"tab-content"],["formGroupName","charger","setupLabel","Charger","discoveryId","electrical-chargers","discoveryPattern","self.electrical.charger*","familyRegex","self\\\\.electrical\\\\.chargers?\\\\.([^.]+)(?:\\\\.|$)","pathPrefix","electrical.charger",1,"tab-content"],["formGroupName","inverter","setupLabel","Inverter","discoveryId","electrical-inverters","discoveryPattern","self.electrical.inverter*","familyRegex","self\\\\.electrical\\\\.inverters?\\\\.([^.]+)(?:\\\\.|$)","pathPrefix","electrical.inverter",1,"tab-content"],["formGroupName","alternator","setupLabel","Alternator","discoveryId","electrical-alternators","discoveryPattern","self.electrical.alternator*","familyRegex","self\\\\.electrical\\\\.alternators?\\\\.([^.]+)(?:\\\\.|$)","pathPrefix","electrical.alternator",1,"tab-content"],["formGroupName","ac","setupLabel","AC","discoveryId","electrical-ac","discoveryPattern","self.electrical.ac*","familyRegex","self\\\\.electrical\\\\.ac\\\\.([^.]+)(?:\\\\.|$)","pathPrefix","electrical.ac.",1,"tab-content"]],template:function(t,i){t&1&&(o(0,"form",0),C("ngSubmit",function(){return i.submitConfig()}),o(1,"h6",1),l(2),a(),o(3,"mat-dialog-content",2)(4,"mat-tab-group",3)(5,"mat-tab"),ze(6,Bp,2,1,"ng-template",4),h(7,Up,10,2,"div",5),h(8,Wp,11,28)(9,$p,1,0,"select-autopilot",6)(10,qp,1,0,"video-camera-setup",7)(11,ju,45,44,"div",5),a(),h(12,Ku,2,0,"mat-tab",8),h(13,Yu,5,2,"mat-tab",9),h(14,Xu,5,5,"mat-tab",10),h(15,th,12,2,"mat-tab",11),h(16,nh,9,1,"mat-tab",12),h(17,ah,2,0,"mat-tab",13),h(18,rh,5,0,"mat-tab",14),h(19,lh,2,0,"mat-tab",15),h(20,sh,2,0,"mat-tab",16),h(21,dh,2,0,"mat-tab",17),h(22,ch,2,0,"mat-tab",18),a()(),b(23,"mat-divider"),o(24,"mat-dialog-actions")(25,"button",19),l(26,"Cancel"),a(),o(27,"button",20),l(28," Save "),a()()()),t&2&&(g("formGroup",i.formMaster),d(2),v(i.titleDialog),d(5),f((i.widgetConfig==null?null:i.widgetConfig.updateInterval)!==void 0?7:-1),d(),f((i.widgetConfig==null?null:i.widgetConfig.datachartPath)!==void 0?8:i.widgetConfig!=null&&i.widgetConfig.autopilot?9:i.widgetConfig!=null&&i.widgetConfig.video?10:11),d(4),f((i.widgetConfig==null?null:i.widgetConfig.ais)!==void 0?12:-1),d(),f((i.widgetConfig==null?null:i.widgetConfig.multiChildCtrls)!==void 0?13:-1),d(),f((i.widgetConfig==null?null:i.widgetConfig.paths)!==void 0&&i.hasConfigurablePaths?14:-1),d(),f((i.widgetConfig==null||i.widgetConfig.gauge==null?null:i.widgetConfig.gauge.type)==="steel"?15:-1),d(),f((i.widgetConfig==null?null:i.widgetConfig.putEnable)!==void 0&&(i.widgetConfig==null?null:i.widgetConfig.multiChildCtrls)===void 0?16:-1),d(),f(i.widgetConfig!=null&&i.widgetConfig.bms?17:-1),d(),f(i.widgetConfig!=null&&i.widgetConfig.solarCharger?18:-1),d(),f(i.widgetConfig!=null&&i.widgetConfig.charger?19:-1),d(),f(i.widgetConfig!=null&&i.widgetConfig.inverter?20:-1),d(),f(i.widgetConfig!=null&&i.widgetConfig.alternator?21:-1),d(),f(i.widgetConfig!=null&&i.widgetConfig.ac?22:-1),d(5),g("disabled",i.saveDisabled()))},dependencies:[$e,_i,fe,wt,Q,ce,Me,Qt,Ci,J,Je,U,Re,Kt,Xe,yt,xt,qt,kt,he,te,Z,ot,Ot,Te,ge,Or,fa,ga,Pr,je,Ae,qe,Ee,ee,ct,et,se,Se,el,Hr,Qr,Wr,Jr,il,al,nl,ol,zn,fl],styles:["[_nghost-%COMP%]{display:block;height:100%;width:100%}.widget-config-dialog-content[_ngcontent-%COMP%]{height:100%}.display-content[_ngcontent-%COMP%]{display:block;width:100%;padding-top:15px;padding-bottom:10px}.warning[_ngcontent-%COMP%]{color:var(--mat-sys-error-container)}.tab-group-content[_ngcontent-%COMP%]{overflow:hidden;width:100%}.flex-container[_ngcontent-%COMP%]{display:flex;flex-direction:row;flex-wrap:wrap;margin:15px 0;gap:15px;align-items:stretch}.panel-group[_ngcontent-%COMP%]{min-width:250px;flex-grow:1}"]})}return n})();function mh(n,s){n&1&&(o(0,"span"),l(1,", "),a())}function ph(n,s){if(n&1&&(o(0,"span",8),l(1),o(2,"span",9),l(3),a()(),h(4,mh,2,0,"span")),n&2){let e=s.$implicit,t=s.$index,i=s.$count,r=u(2);g("ngClass",r.pluginDependencyValid()?e.required?"dependency-required-ok":e.enabled?"dependency-optional-ok":"dependency-optional-missing-met":e.enabled?e.required?"dependency-required-ok":"dependency-optional-ok":e.required?"dependency-required-error":"dependency-optional-error"),$("title",e.required?"Required":"Optional"),d(),We(" ",e.enabled?"\u2714":"\u2716"," ",e.name," "),d(2),v(e.required?"":"(optional)"),d(),f(t!==i-1?4:-1)}}function uh(n,s){if(n&1&&(o(0,"div",7)(1,"span"),l(2,"Plugins:"),a(),I(3,ph,5,6,null,null,oe),a()),n&2){let e=u();ai(e.pluginsStatus().length>0?"margin-bottom: 8px;margin-top: 4px;":""),d(),Ue(e.pluginDependencyValid()?"":"dependency-error"),d(2),A(e.pluginsStatus())}}var bl=(()=>{class n{svgIcon=S.required();iconSize=S.required();name=S.required();description=S.required();pluginsStatus=S.required();pluginDependencyValid=S.required();onKeydown(e){(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),e.target.click())}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["widget-list-card"]],hostBindings:function(t,i){t&1&&C("keydown",function(c){return i.onKeydown(c)})},inputs:{svgIcon:[1,"svgIcon"],iconSize:[1,"iconSize"],name:[1,"name"],description:[1,"description"],pluginsStatus:[1,"pluginsStatus"],pluginDependencyValid:[1,"pluginDependencyValid"]},decls:9,vars:11,consts:[["role","button","tabindex","0",1,"item-container"],[1,"item-icon"],["aria-hidden","false",3,"svgIcon"],[1,"item-label"],[1,"title","no-text-select"],[1,"dependency","no-text-select",3,"style"],[1,"description","no-text-select"],[1,"dependency","no-text-select"],[3,"ngClass"],[1,"plugin-type-label"]],template:function(t,i){t&1&&(o(0,"div",0)(1,"div",1),b(2,"mat-icon",2),a(),o(3,"div",3)(4,"p",4),l(5),a(),h(6,uh,5,4,"div",5),o(7,"span",6),l(8),a()()()),t&2&&($("aria-disabled",i.pluginDependencyValid()?null:"true"),d(2),zt("width",i.iconSize(),"px")("height",i.iconSize(),"px"),g("svgIcon",i.svgIcon()),d(2),ai(i.pluginsStatus().length>0?"margin-bottom:0px; margin-top: 4px":""),d(),v(i.name()),d(),f(i.pluginsStatus().length>0?6:-1),d(2),v(i.description()))},dependencies:[io,Za,de,K],styles:["[_nghost-%COMP%]{display:block;text-align:center;-webkit-tap-highlight-color:rgba(0,0,0,0);cursor:pointer;padding:0}.item-container[_ngcontent-%COMP%]{display:flex;flex-direction:row;flex-wrap:nowrap;align-items:stretch;width:100%;height:100%;margin:0;padding:15px;border:solid 1px var(--mat-sys-outline);cursor:pointer}.item-container[_ngcontent-%COMP%]:hover{background-color:var(--mat-sys-inverse-on-surface)}.item-container[_ngcontent-%COMP%]:focus-visible{background-color:var(--mat-sys-surface-bright);outline:-webkit-focus-ring-color auto 0px}.item-icon[_ngcontent-%COMP%]{width:48px}.item-label[_ngcontent-%COMP%]{width:calc(100% - 48px);text-align:left;padding-left:15px}.title[_ngcontent-%COMP%]{font-size:var(--mat-sys-label-medium-line-height)}.description[_ngcontent-%COMP%]{color:var(--mat-sys-outline)}.dependency[_ngcontent-%COMP%]{color:var(--mat-sys-outline);text-align:start;font-style:italic;font-size:var(--mat-sys-label-large-size)}.dependency-error[_ngcontent-%COMP%]{color:var(--skip-port-color);font-weight:700}.dependency-required-ok[_ngcontent-%COMP%]{color:var(--skip-starboard-color);font-weight:700}.dependency-required-error[_ngcontent-%COMP%]{color:var(--skip-port-color);font-weight:700;text-decoration:underline}.dependency-optional-ok[_ngcontent-%COMP%]{color:var(--skip-starboard-color)}.dependency-optional-error[_ngcontent-%COMP%]{color:var(--skip-port-color)}.dependency-optional-missing-met[_ngcontent-%COMP%]{color:var(--mat-sys-outline);text-decoration:line-through}.dependency-optional-present-met[_ngcontent-%COMP%]{color:var(--mat-sys-outline)}.plugin-type-label[_ngcontent-%COMP%]{font-size:.8em;margin-left:2px;opacity:.7}.dependency-ok[_ngcontent-%COMP%]{color:var(--skip-starboard-color)}.no-text-select[_ngcontent-%COMP%]{-webkit-user-select:none;user-select:none}"]})}return n})();var hh=(n,s)=>s.selector;function fh(n,s){if(n&1&&(o(0,"mat-button-toggle",1),l(1),a()),n&2){let e=s.$implicit;g("value",e),d(),B(" ",e," ")}}function gh(n,s){if(n&1){let e=P();o(0,"widget-list-card",3),C("click",function(){let i=y(e).$implicit,r=u();return x(r.onSelectWidget(i))}),a()}if(n&2){let e=s.$implicit;G("dependency-missing",!e.isDependencyValid),g("svgIcon",e.icon)("iconSize",48)("name",e.name)("description",e.description)("pluginDependencyValid",e.isDependencyValid)("pluginsStatus",e.pluginsStatus)}}var vl=(()=>{class n{_dialogRef=m(Ct);_widgets=m(Yo);_widgetsList=[];filteredWidgetsList=T([]);_widgetCategory=T("Core");isDependencyValid=T(!0);ngOnInit(){this.loadWidgets()}loadWidgets(){return N(this,null,function*(){this._widgetsList=yield this._widgets.getSkipWidgetsWithStatus(),this.filteredWidgetsList.set(this._widgetsList.filter(e=>e.category===this._widgetCategory()))})}onCategoryChange(e){this.filteredWidgetsList.set(this._widgetsList.filter(t=>t.category===e.value)),this._widgetCategory.set(e.value)}onSelectWidget(e){if(!e.isDependencyValid)return;let{name:t,description:i,icon:r,minWidth:c,minHeight:p,defaultWidth:_,defaultHeight:k,category:w,requiredPlugins:M,anyOfPlugins:ie,selector:ne,componentClassName:di}=e,Tt=W(R({name:t,description:i,icon:r,minWidth:c,minHeight:p,defaultWidth:_,defaultHeight:k,category:w,requiredPlugins:M},ie?{anyOfPlugins:ie}:{}),{selector:ne,componentClassName:di});this._dialogRef.close(Tt)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["widgets-list"]],decls:7,vars:1,consts:[["name","widgetCategories","aria-label","Widget categories",1,"list-filter",3,"change","value"],[3,"value"],[3,"dependency-missing","svgIcon","iconSize","name","description","pluginDependencyValid","pluginsStatus"],[3,"click","svgIcon","iconSize","name","description","pluginDependencyValid","pluginsStatus"]],template:function(t,i){t&1&&(o(0,"div")(1,"mat-button-toggle-group",0),C("change",function(c){return i.onCategoryChange(c)}),I(2,fh,2,2,"mat-button-toggle",1,oe),a(),o(4,"div"),I(5,gh,1,8,"widget-list-card",2,hh),a()()),t&2&&(d(),g("value",i._widgetCategory()),d(),A(i._widgets.categories),d(3),A(i.filteredWidgetsList()))},dependencies:[Mn,wn,Sn,bl],styles:[".list-filter[_ngcontent-%COMP%]{margin-bottom:20px}.dependency-missing[_ngcontent-%COMP%]{pointer-events:none;opacity:.8;background-color:var(--mat-sys-neutral10)}"]})}return n})();var qi=12,Cl=13,yl=14,xl=15,kl=16,wl=17,Sl=18,Ml=19,bh={"widget-wind-steer":{headingPath:{path:"self.navigation.headingTrue",isPathConfigurable:!0,description:"Heading"},appWindAngle:{path:"self.environment.wind.angleApparent",isPathConfigurable:!1},appWindSpeed:{path:"self.environment.wind.speedApparent",isPathConfigurable:!1},trueWindAngle:{path:"self.environment.wind.angleTrueWater",isPathConfigurable:!0,description:"Wind Angle"},trueWindSpeed:{path:"self.environment.wind.speedTrue",isPathConfigurable:!1},courseOverGround:{path:"self.navigation.courseOverGroundTrue",isPathConfigurable:!0,description:"Course Over Ground"},set:{path:"self.environment.current.setTrue",isPathConfigurable:!1},drift:{path:"self.environment.current.drift",isPathConfigurable:!1}},"widget-racesteer":{headingPath:{path:"self.navigation.headingTrue",isPathConfigurable:!0,description:"Heading"},appWindAngle:{path:"self.environment.wind.angleApparent",isPathConfigurable:!1},appWindSpeed:{path:"self.environment.wind.speedApparent",isPathConfigurable:!1},trueWindAngle:{path:"self.environment.wind.angleTrueWater",isPathConfigurable:!0,description:"Wind Angle"},trueWindSpeed:{path:"self.environment.wind.speedTrue",isPathConfigurable:!1},courseOverGround:{path:"self.navigation.courseOverGroundTrue",isPathConfigurable:!0,description:"Course Over Ground"},nextWaypointBearing:{path:"self.navigation.course.calcValues.bearingTrue",isPathConfigurable:!1},set:{path:"self.environment.current.setTrue",isPathConfigurable:!1},drift:{path:"self.environment.current.drift",isPathConfigurable:!1}},"widget-windtrends-chart":{trueWindDirection:{path:"self.environment.wind.directionTrue",isPathConfigurable:!0,description:"Wind Direction"},trueWindSpeed:{path:"self.environment.wind.speedTrue",isPathConfigurable:!1}}},vh=["headingMag","headingTrue","windAngleApparent"],Ch=["windAngleTrueWater"],yh=[".position.latitude",".position.longitude",".position.altitude",".attitude.roll",".attitude.pitch",".attitude.yaw"],xh=new Set(["widget-position","widget-heel-gauge","widget-horizon"]),Tl=11,El=(()=>{class n{_storage=m(Io);_settings=m(Ao);upgrading=T(!1);error=T(null);messages=T([]);legacyFileVersion=9;legacyConfigVersion=10;static widgetTypeToSelectorMap={WidgetNumeric:"widget-numeric",WidgetTextGeneric:"widget-text",WidgetDateGeneric:"widget-datetime",WidgetBooleanSwitch:"widget-boolean-switch",WidgetBlank:"widget-blank",WidgetStateComponent:"widget-button",WidgetSimpleLinearComponent:"widget-simple-linear",WidgetGaugeNgLinearComponent:"widget-gauge-ng-linear",WidgetGaugeNgRadialComponent:"widget-gauge-ng-radial",WidgetGaugeNgCompassComponent:"widget-gauge-ng-compass",WidgetGaugeComponent:"widget-gauge-steel",WidgetWindComponent:"widget-wind-steer",WidgetFreeboardskComponent:"widget-freeboardsk",WidgetAutopilotComponent:"widget-autopilot",WidgetDataChart:"widget-data-chart",WidgetRaceTimerComponent:"widget-racetimer",WidgetIframeComponent:"widget-iframe"};runUpgrade(e){return N(this,null,function*(){if(!this._storage.canPersist()){console.warn("[Configuration Upgrade Service] Read-only session: skipping the configuration migration.");return}if(this.error.set(null),this.upgrading.set(!0),this.messages.set([]),e===void 0)try{let t=yield this._storage.listConfigs(this.legacyFileVersion);for(let i of t){let r=yield this.transformConfig(i);if(r)try{yield this._storage.setConfig(r.scope,r.name,r.newConfiguration),yield this._storage.setConfig(r.scope,r.name,r.oldConfiguration,this.legacyFileVersion),this.pushMsg(`[Upgrade] Configuration ${r.scope}/${r.name} upgraded to version ${qi}. Old configuration patched to version 0.`)}catch(c){this.pushError(`[Upgrade] Error saving configuration for ${i.name}: ${c.message}`)}}setTimeout(()=>this._settings.reloadApp(),1500)}catch(t){this.pushError("Error fetching configuration data: "+t.message),this.upgrading.set(!1)}else if(e===11)try{let t=yield this._storage.listConfigs(11);for(let i of t)try{let r=yield this._storage.getConfig(i.scope,i.name,11),c=Li(r);this.pushMsg(`[Upgrade] Saving configuration backup to file ${i.scope}/${i.name}...`),yield this._storage.setConfig(i.scope,i.name,c,11.99),this.pushMsg(`[Upgrade] ${i.scope}/${i.name} -> v${qi}.`);let p=this.migrateOneAppVersion(r,11);if(!p)continue;this.pushMsg("[Upgrade] Saving upgraded configurations..."),yield this._storage.setConfig(i.scope,i.name,p)}catch(r){this.pushError(`[Upgrade] Error upgrading ${i.scope}/${i.name}: ${r.message}`)}this.pushMsg("[Upgrade] Reloading app to finalize upgrade..."),setTimeout(()=>this._settings.reloadApp(),1500)}catch(t){this.pushError("Error fetching configuration data. Aborting upgrade. Details: "+t.message),this.upgrading.set(!1)}else if(e===12)try{let t=yield this._storage.listConfigs(11);for(let i of t)try{let r=yield this._storage.getConfig(i.scope,i.name,11);this.pushMsg(`[Upgrade] ${i.scope}/${i.name} -> v${Cl}.`);let c=this.migrateOneAppVersion(r,12);if(!c)continue;yield this._storage.setConfig(i.scope,i.name,c)}catch(r){this.pushError(`[Upgrade] Error upgrading ${i.scope}/${i.name}: ${r.message}`)}this.pushMsg("[Upgrade] Reloading app to finalize upgrade..."),setTimeout(()=>this._settings.reloadApp(),1500)}catch(t){this.pushError("Error fetching configuration data. Aborting upgrade. Details: "+t.message),this.upgrading.set(!1)}else if(e===13)try{let t=yield this._storage.listConfigs(11);for(let i of t)try{let r=yield this._storage.getConfig(i.scope,i.name,11);this.pushMsg(`[Upgrade] ${i.scope}/${i.name} -> v${yl}.`);let c=this.migrateOneAppVersion(r,13);if(!c)continue;yield this._storage.setConfig(i.scope,i.name,c)}catch(r){this.pushError(`[Upgrade] Error upgrading ${i.scope}/${i.name}: ${r.message}`)}this.pushMsg("[Upgrade] Reloading app to finalize upgrade..."),setTimeout(()=>this._settings.reloadApp(),1500)}catch(t){this.pushError("Error fetching configuration data. Aborting upgrade. Details: "+t.message),this.upgrading.set(!1)}else if(e===14)try{let t=yield this._storage.listConfigs(11);for(let i of t)try{let r=yield this._storage.getConfig(i.scope,i.name,11);this.pushMsg(`[Upgrade] ${i.scope}/${i.name} -> v${xl}.`);let c=this.migrateOneAppVersion(r,14);if(!c)continue;yield this._storage.setConfig(i.scope,i.name,c)}catch(r){this.pushError(`[Upgrade] Error upgrading ${i.scope}/${i.name}: ${r.message}`)}this.pushMsg("[Upgrade] Reloading app to finalize upgrade..."),setTimeout(()=>this._settings.reloadApp(),1500)}catch(t){this.pushError("Error fetching configuration data. Aborting upgrade. Details: "+t.message),this.upgrading.set(!1)}else if(e===15)try{let t=yield this._storage.listConfigs(11);for(let i of t)try{let r=yield this._storage.getConfig(i.scope,i.name,11);this.pushMsg(`[Upgrade] ${i.scope}/${i.name} -> v${kl}.`);let c=this.migrateOneAppVersion(r,15);if(!c)continue;yield this._storage.setConfig(i.scope,i.name,c)}catch(r){this.pushError(`[Upgrade] Error upgrading ${i.scope}/${i.name}: ${r.message}`)}this.pushMsg("[Upgrade] Reloading app to finalize upgrade..."),setTimeout(()=>this._settings.reloadApp(),1500)}catch(t){this.pushError("Error fetching configuration data. Aborting upgrade. Details: "+t.message),this.upgrading.set(!1)}else if(e===16)try{let t=yield this._storage.listConfigs(11);for(let i of t)try{let r=yield this._storage.getConfig(i.scope,i.name,11);this.pushMsg(`[Upgrade] ${i.scope}/${i.name} -> v${wl}.`);let c=this.migrateOneAppVersion(r,16);if(!c)continue;yield this._storage.setConfig(i.scope,i.name,c)}catch(r){this.pushError(`[Upgrade] Error upgrading ${i.scope}/${i.name}: ${r.message}`)}this.pushMsg("[Upgrade] Reloading app to finalize upgrade..."),setTimeout(()=>this._settings.reloadApp(),1500)}catch(t){this.pushError("Error fetching configuration data. Aborting upgrade. Details: "+t.message),this.upgrading.set(!1)}else if(e===17)try{let t=yield this._storage.listConfigs(11);for(let i of t)try{let r=yield this._storage.getConfig(i.scope,i.name,11);this.pushMsg(`[Upgrade] ${i.scope}/${i.name} -> v${Sl}.`);let c=this.migrateOneAppVersion(r,17);if(!c)continue;yield this._storage.setConfig(i.scope,i.name,c)}catch(r){this.pushError(`[Upgrade] Error upgrading ${i.scope}/${i.name}: ${r.message}`)}this.pushMsg("[Upgrade] Reloading app to finalize upgrade..."),setTimeout(()=>this._settings.reloadApp(),1500)}catch(t){this.pushError("Error fetching configuration data. Aborting upgrade. Details: "+t.message),this.upgrading.set(!1)}else if(e===18)try{let t=yield this._storage.listConfigs(11);for(let i of t)try{let r=yield this._storage.getConfig(i.scope,i.name,11);this.pushMsg(`[Upgrade] ${i.scope}/${i.name} -> v${Ml}.`);let c=this.migrateOneAppVersion(r,18);if(!c)continue;yield this._storage.setConfig(i.scope,i.name,c)}catch(r){this.pushError(`[Upgrade] Error upgrading ${i.scope}/${i.name}: ${r.message}`)}this.pushMsg("[Upgrade] Reloading app to finalize upgrade..."),setTimeout(()=>this._settings.reloadApp(),1500)}catch(t){this.pushError("Error fetching configuration data. Aborting upgrade. Details: "+t.message),this.upgrading.set(!1)}else{let t={app:this._settings.loadConfigFromLocalStorage("appConfig"),widget:this._settings.loadConfigFromLocalStorage("widgetConfig"),layout:this._settings.loadConfigFromLocalStorage("layoutConfig"),theme:this._settings.loadConfigFromLocalStorage("themeConfig")},i=this.transformApp(t.app),r=this.transformTheme(t.theme),c=t.layout?.rootSplits||[],p=t.layout?.splitSets||[],_=t.widget?.widgets||[],k=c.map((w,M)=>{let ie=this.extractWidgetsFromSplitSets(p,_,w);return{id:w,name:`Page ${M+1}`,configuration:ie}});this.migrateUseNeedleToEnableNeedle(k),fi(Ut.appConfig,JSON.stringify(i)),fi(Ut.dashboardsConfig,JSON.stringify(k)),fi(Ut.themeConfig,JSON.stringify(r)),setTimeout(()=>this._settings.reloadApp(),1500),this.upgrading.set(!1)}})}startFresh(){if(this.error.set(null),this.upgrading.set(!0),this._storage.initConfig===null)this._storage.listConfigs(this.legacyFileVersion).then(e=>N(this,null,function*(){for(let t of e){let i=yield this._storage.getConfig(t.scope,t.name,this.legacyFileVersion);if(!i.app){this.pushError(`[Upgrade] Configuration ${t.scope}/${t.name} has no app section; skipping retire.`);continue}i.app.configVersion=0;try{yield this._storage.setConfig(t.scope,t.name,i,this.legacyFileVersion),this.pushMsg(`[Retired] Configuration ${t.scope}/${t.name} patched to version 0.`)}catch(r){this.pushError(`[Upgrade] Error saving configuration for ${t.name}.`)}}})).catch(e=>this.pushError("Error fetching configuration data: "+e.message)).finally(()=>{this.upgrading.set(!1),this._settings.resetSettings()});else{let e={app:null,dashboards:[],theme:null};if(e.app=this._settings.loadConfigFromLocalStorage("appConfig"),e.theme=this._settings.loadConfigFromLocalStorage("themeConfig"),!e.app||!e.theme){this.pushError("[Upgrade Service] Cannot start fresh: local appConfig/themeConfig failed to load."),this.upgrading.set(!1);return}e.app.configVersion=qi,e.app.nightModeBrightness=.27,e.theme.themeName="",fi(Ut.appConfig,JSON.stringify(e.app)),fi(Ut.themeConfig,JSON.stringify(e.theme)),ia(Ut.widgetConfig),ia(Ut.layoutConfig),this.upgrading.set(!1)}}migrateImportedConfig(e){let t=e.app?.configVersion;if(typeof t!="number"||!Number.isInteger(t))throw new Error("This configuration has no recognizable version number and cannot be imported.");if(t===19)return{config:e,migrated:!1};if(t>19)throw new Error(`This configuration is version ${t}, which is newer than this version of Skip supports (version ${19}). Update Skip and try again.`);if(t<Tl)throw new Error(`This configuration is version ${t}, which is too old to import automatically (the minimum is version ${Tl}). Load it into an older KIP, export it again, then import it here.`);let i=Li(e),r=t;for(;r<19;){let c=this.migrateOneAppVersion(i,r),p=c?.app?.configVersion;if(!c||typeof p!="number"||p<=r)throw new Error(`This configuration could not be migrated from version ${r}.`);i=c,r=p}return{config:i,migrated:!0}}migrateOneAppVersion(e,t){switch(t){case 11:return this.upgradeConfig(e);case 12:return this.upgradeConfigV12toV13(e);case 13:return this.upgradeConfigV13toV14(e);case 14:return this.upgradeConfigV14toV15(e);case 15:return this.upgradeConfigV15toV16(e);case 16:return this.upgradeConfigV16toV17(e);case 17:return this.upgradeConfigV17toV18(e);case 18:return this.upgradeConfigV18toV19(e);default:return null}}transformConfig(e){return N(this,null,function*(){let t=yield this._storage.getConfig(e.scope,e.name,this.legacyFileVersion);if(!t.app||t.app.configVersion!==this.legacyConfigVersion)return this.pushError(`[Upgrade Service] ${e.scope}/${e.name} is not an upgradable version ${this.legacyConfigVersion} config. Skipping.`),null;let i=this.transformApp(t.app),r=this.transformTheme(t.theme),c=t.layout?.rootSplits||[],p=t.layout?.splitSets||[],_=t.widget?.widgets||[],k=c.map((M,ie)=>{let ne=this.extractWidgetsFromSplitSets(p,_,M);return{id:M,name:`Page ${ie+1}`,configuration:ne}});this.migrateUseNeedleToEnableNeedle(k);let w=Li(t);return w.app.configVersion=0,{scope:e.scope,name:e.name,newConfiguration:{app:i,theme:r,dashboards:k},oldConfiguration:w}})}transformWidget(e,t){if(e.color==="white"&&(e.color="contrast"),e.textColor){switch(e.textColor){case"text":e.color="contrast";break;case"primary":e.color="blue";break;case"accent":e.color="yellow";break;case"warn":e.color="purple";break;case"nobar":t==="WidgetGaugeNgLinearComponent"&&(e.color="blue",e.gauge=e.gauge||{},e.gauge.useNeedle=!1);break;default:e.color=e.textColor}delete e.textColor}return e}transformApp(e){if(!e)return null;let t=Li(e);return t.configVersion=qi,t.nightModeBrightness=.27,this.removeSplitShellConfigKeys(t),t}transformTheme(e){return e?{themeName:""}:null}upgradeConfig(e){try{let t=e.app;if(!t||t.configVersion!==11)return this.pushError(`[Upgrade Service] Config version ${t?.configVersion} upgrade is not supported. Skipping...`),null;this.removeSplitShellConfigKeys(t),this.migrateUseNeedleToEnableNeedle(e.dashboards);let i=0,r=0;if(Array.isArray(e.dashboards)){for(let c of e.dashboards)if(c&&Array.isArray(c.configuration)){for(let p of c.configuration)if(p&&typeof p=="object"){p.selector!=="widget-host2"&&(p.selector="widget-host2",i++);let _=k=>{let w=p[k],M=typeof w=="string"?Number(w):w;Number.isFinite(M)&&M!==0&&(p[k]=M*2,r++)};if(_("w"),_("h"),_("x"),_("y"),p.w===void 0||p.w===null){let k=p.minW,w=k||2;p.w=w,r++}if(p.h===void 0||p.h===null){let k=p.minH,w=k||2;p.h=w,r++}}}}return i&&this.pushMsg(`[Upgrade] Updated ${i} widget selector(s) to 'widget-host2'.`),r&&this.pushMsg(`[Upgrade] Doubled widget grid metrics for ${r} non-zero (w/h/x/y) entries.`),t.configVersion=qi,{app:t,theme:e.theme,dashboards:e.dashboards}}catch(t){return this.pushError(`[Upgrade Service] Error upgrading ${e.app?.configVersion}: ${t.message}`),null}}upgradeConfigV12toV13(e){try{let t=e.app;if(!t||t.configVersion!==12)return this.pushError(`[Upgrade Service] Config version ${t?.configVersion} is not an upgradable v12 config. Skipping...`),null;if(delete t.dataSets,Array.isArray(e.dashboards)){for(let i of e.dashboards)if(!(!i||!Array.isArray(i.configuration)))for(let r of i.configuration){let c=r?.input?.widgetProperties?.config;c&&typeof c=="object"&&(delete c.datasetUUID,delete c.chartEngine)}}return t.configVersion=Cl,{app:t,theme:e.theme,dashboards:e.dashboards}}catch(t){return this.pushError(`[Upgrade Service] Error upgrading v12->v13: ${t.message}`),null}}upgradeConfigV13toV14(e){try{let t=e.app;if(!t||t.configVersion!==13)return this.pushError(`[Upgrade Service] Config version ${t?.configVersion} is not an upgradable v13 config. Skipping...`),null;let i=0;if(Array.isArray(e.dashboards)){for(let r of e.dashboards)if(!(!r||!Array.isArray(r.configuration)))for(let c of r.configuration){let p=c?.input?.widgetProperties;if(!p||typeof p.type!="string"||!xh.has(p.type))continue;let _=p.type,k=p.config,w=k?.paths;if(w&&typeof w=="object")for(let M of Object.values(w))!M||typeof M.path!="string"||yh.some(ie=>M.path.endsWith(ie))&&(M.path=M.path.slice(0,M.path.lastIndexOf(".")),M.isPathConfigurable=!1,i++);k&&(_==="widget-heel-gauge"||_==="widget-horizon")&&(k.supportAutomaticHistoricalSeries=!1)}}return i&&this.pushMsg(`[Upgrade] Rewrote ${i} compound sub-field path(s) to their canonical whole path.`),t.configVersion=yl,{app:t,theme:e.theme,dashboards:e.dashboards}}catch(t){return this.pushError(`[Upgrade Service] Error upgrading v13->v14: ${t.message}`),null}}upgradeConfigV14toV15(e){try{let t=e.app;if(!t||t.configVersion!==14)return this.pushError(`[Upgrade Service] Config version ${t?.configVersion} is not an upgradable v14 config. Skipping...`),null;let i=0;if(Array.isArray(e.dashboards)){for(let r of e.dashboards)if(!(!r||!Array.isArray(r.configuration)))for(let c of r.configuration){let p=c?.input?.widgetProperties;if(!p||p.type!=="widget-position")continue;let _=p.config;if(!_||typeof _!="object")continue;let k=_.paths,w=k&&typeof k=="object"?Object.values(k).find(M=>M&&typeof M=="object"):void 0;_.paths={positionPath:{description:"Position",path:"self.navigation.position",source:typeof w?.source=="string"?w.source:"default",pathType:"object",isPathConfigurable:!0,showPathSkUnitsFilter:!1,pathSkUnitsFilter:null,sampleTime:typeof w?.sampleTime=="number"?w.sampleTime:500}},i++}}return i&&this.pushMsg(`[Upgrade] Collapsed ${i} position widget(s) to a single location path.`),t.configVersion=xl,{app:t,theme:e.theme,dashboards:e.dashboards}}catch(t){return this.pushError(`[Upgrade Service] Error upgrading v14->v15: ${t.message}`),null}}upgradeConfigV15toV16(e){try{let t=e.app;if(!t||t.configVersion!==15)return this.pushError(`[Upgrade Service] Config version ${t?.configVersion} is not an upgradable v15 config. Skipping...`),null;let i=new Set(["widget-heel-gauge","widget-horizon"]),r=new Set(["widget-heel-gauge","widget-horizon","widget-racer-timer","widget-racer-line"]),c=0;if(Array.isArray(e.dashboards)){for(let p of e.dashboards)if(!(!p||!Array.isArray(p.configuration)))for(let _ of p.configuration){let k=_?.input?.widgetProperties;if(!(!k||typeof k.type!="string"||!r.has(k.type)||!k.config)){if(i.has(k.type)){let w=k.config.paths;if(w&&typeof w=="object")for(let M of Object.values(w))!M||typeof M!="object"||(M.path="self.navigation.attitude",M.pathType="number",M.isPathConfigurable=!1,M.convertUnitTo="deg",c++)}k.config.enableTimeout=!0,k.config.dataTimeout=5}}}return c&&this.pushMsg(`[Upgrade] Reset ${c} attitude path(s) to the fixed hidden default.`),t.configVersion=kl,{app:t,theme:e.theme,dashboards:e.dashboards}}catch(t){return this.pushError(`[Upgrade Service] Error upgrading v15->v16: ${t.message}`),null}}upgradeConfigV16toV17(e){try{let t=e.app;if(!t||t.configVersion!==16)return this.pushError(`[Upgrade Service] Config version ${t?.configVersion} is not an upgradable v16 config. Skipping...`),null;let i=0;if(Array.isArray(e.dashboards)){for(let r of e.dashboards)if(!(!r||!Array.isArray(r.configuration)))for(let c of r.configuration){let _=c?.input?.widgetProperties?.config;if(!_||!_.paths||typeof _.paths!="object")continue;let k=[];for(let w of Object.values(_.paths)){if(!w||typeof w!="object")continue;let M=w.sampleTime;typeof M=="number"&&Number.isFinite(M)&&M>0&&k.push(M),delete w.sampleTime}_.updateInterval=k.length?Math.min(...k):1e3,i++}}return i&&this.pushMsg(`[Upgrade] Collapsed per-path sampleTime to a widget-level updateInterval on ${i} widget(s).`),t.configVersion=wl,{app:t,theme:e.theme,dashboards:e.dashboards}}catch(t){return this.pushError(`[Upgrade Service] Error upgrading v16->v17: ${t.message}`),null}}upgradeConfigV17toV18(e){try{let t=e.app;if(!t||t.configVersion!==17)return this.pushError(`[Upgrade Service] Config version ${t?.configVersion} is not an upgradable v17 config. Skipping...`),null;let i=0;if(Array.isArray(e.dashboards)){for(let r of e.dashboards)if(!(!r||!Array.isArray(r.configuration)))for(let c of r.configuration){let p=c?.input?.widgetProperties;if(!p||typeof p.type!="string")continue;let _=bh[p.type],k=p.config?.paths;if(!_||!k||typeof k!="object")continue;let w=k;for(let[M,ie]of Object.entries(_)){let ne=w[M];!ne||typeof ne!="object"||(ne.path=ie.path,ne.isPathConfigurable=ie.isPathConfigurable,ie.description!==void 0&&(ne.description=ie.description),ne.source="default",i++)}}}return i&&this.pushMsg(`[Upgrade] Reset ${i} wind-family path(s) to the fixed/choice default.`),t.configVersion=Sl,{app:t,theme:e.theme,dashboards:e.dashboards}}catch(t){return this.pushError(`[Upgrade Service] Error upgrading v17->v18: ${t.message}`),null}}upgradeConfigV18toV19(e){try{let t=e.app;if(!t||t.configVersion!==18)return this.pushError(`[Upgrade Service] Config version ${t?.configVersion} is not an upgradable v18 config. Skipping...`),null;let i=0;if(Array.isArray(e.dashboards)){for(let r of e.dashboards)if(!(!r||!Array.isArray(r.configuration)))for(let c of r.configuration){let p=c?.input?.widgetProperties;if(!p||p.type!=="widget-autopilot")continue;let _=p.config?.paths;if(!_||typeof _!="object")continue;let k=_;for(let w of vh)k[w]&&typeof k[w]=="object"&&(k[w].isPathConfigurable=!1,i++);for(let w of Ch)w in k&&(delete k[w],i++)}}return i&&this.pushMsg(`[Upgrade] Slimmed ${i} autopilot path field(s).`),t.configVersion=Ml,{app:t,theme:e.theme,dashboards:e.dashboards}}catch(t){return this.pushError(`[Upgrade Service] Error upgrading v18->v19: ${t.message}`),null}}migrateUseNeedleToEnableNeedle(e){if(!Array.isArray(e))return;let t=0;for(let i of e)if(!(!i||!Array.isArray(i.configuration)))for(let r of i.configuration){let _=r.input?.widgetProperties?.config?.gauge;!_||typeof _!="object"||Object.prototype.hasOwnProperty.call(_,"useNeedle")&&(_.enableNeedle===void 0?_.enableNeedle=!!_.useNeedle:_.enableNeedle=!!_.enableNeedle,delete _.useNeedle,t++)}t&&this.pushMsg(`[Upgrade] Renamed gauge.useNeedle -> gauge.enableNeedle on ${t} widget(s).`)}removeSplitShellConfigKeys(e){if(!e)return;let t=e;delete t.splitShellEnabled,delete t.splitShellSide,delete t.splitShellWidth,delete t.splitShellSwipeDisabled}extractWidgetsFromSplitSets(e,t,i){let r=new Map(t.map(Tt=>[Tt.uuid,Tt])),c=[],p=[],_=0,k=0,w=24,M=24,ie=3,ne=3,di=Tt=>{let Ta=e.find(ii=>ii.uuid===Tt);if(!Ta){p.push(`Missing splitSet with UUID: ${Tt}`);return}Ta.splitAreas.forEach(ii=>{if(ii.type==="widget"){let Nt=r.get(ii.uuid);if(Nt){if(Nt.type==="WidgetBlank")return;if(k+ne>M){p.push(`No space left for widget: ${Nt.uuid}`);return}let Rl=n.widgetTypeToSelectorMap[Nt.type]||"widget-unknown",Nl=this.transformWidget(Nt.config,Nt.type);c.push({id:Nt.uuid,selector:"widget-host2",input:{widgetProperties:{type:Rl,uuid:Nt.uuid,config:Nl}},x:_,y:k,w:ie,h:ne}),_+=ie,_>=w&&(_=0,k+=ne)}else p.push(`Missing widget with UUID: ${ii.uuid}`)}else ii.type==="splitSet"&&di(ii.uuid)})};return di(i),p.length&&this.pushMsg("Transformation Issues: "+p.join("; ")),c}pushMsg(e){this.messages.update(t=>[...t,e])}pushError(e){this.error.set(e),this.pushMsg(e)}static \u0275fac=function(t){return new(t||n)};static \u0275prov=xe({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})();var Il=(()=>{class n{dialogRef=m(Ct);upgradeSvc=m(El);upgrade(){this.upgradeSvc.runUpgrade(void 0)}startFresh(){this.upgradeSvc.startFresh(),this.dialogRef.close()}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["upgrade-config"]],decls:146,vars:0,consts:[[1,"warning"],[1,"nav-table"],[2,"font-size","x-large"],["colspan","2"],["href","https://discord.gg/AMDYT2DQga","target","_blank"],[1,"button-group"],["mat-flat-button","",3,"click"],["mat-flat-button","",2,"margin-left","20px",3,"click"]],template:function(t,i){t&1&&(o(0,"h2"),l(1,"All New Touch, Mouse, and Keyboard Navigation"),a(),o(2,"p",0)(3,"strong"),l(4,"Heads up:"),a(),l(5," The new version introduces a completely redesigned fullscreen interface with no navigation bar. Please review the input modes table below to get an understanding of the new ways to operate Skip before upgrading. After the upgrade, give yourself time to get comfortable with the changes."),a(),o(6,"table",1)(7,"thead")(8,"tr")(9,"th"),l(10,"Actions"),a(),o(11,"th"),l(12,"Touch"),a(),o(13,"th"),l(14,"Mouse"),a(),o(15,"th"),l(16,"Keyboard Shortcuts"),a()()(),o(17,"tbody")(18,"tr")(19,"td"),l(20,"Show the toolbar"),a(),o(21,"td"),l(22,"Swipe down from the top"),a(),o(23,"td"),l(24,"Scroll up, or tap the top peek strip"),a(),o(25,"td"),l(26,"N/A"),a()(),o(27,"tr")(28,"td"),l(29,"Move between pages"),a(),o(30,"td"),l(31,"Swipe left or right"),a(),o(32,"td"),l(33,"Scroll horizontally"),a(),o(34,"td")(35,"kbd",2),l(36,"\u2190"),a(),l(37,"/"),o(38,"kbd",2),l(39,"\u2192"),a(),l(40," (Left/Right Arrow)"),a()(),o(41,"tr")(42,"td"),l(43,"Enter page edit mode"),a(),o(44,"td",3),l(45,"Tap the edit button on the toolbar"),a(),o(46,"td")(47,"kbd"),l(48,"E"),a()()(),o(49,"tr")(50,"td"),l(51,"Cancel page edit"),a(),o(52,"td",3),l(53,"Tap the Cancel button"),a(),o(54,"td")(55,"kbd"),l(56,"Esc"),a()()(),o(57,"tr")(58,"td"),l(59,"Toggle Fullscreen"),a(),o(60,"td",3),l(61,"Tap the fullscreen button on the toolbar"),a(),o(62,"td")(63,"kbd"),l(64,"F"),a()()(),o(65,"tr")(66,"td"),l(67,"Toggle Night mode"),a(),o(68,"td",3),l(69,"Tap the night-mode button on the toolbar"),a(),o(70,"td")(71,"kbd"),l(72,"N"),a()()()()(),o(73,"i"),l(74,"Note that the words Touch and Tap are synonymous with mouse click."),a(),b(75,"br")(76,"br"),o(77,"h2"),l(78,"Migration Limitations"),a(),o(79,"p")(80,"span",0),l(81,"Important:"),a(),l(82," The new widget layout engine is "),o(83,"strong"),l(84,"completely different"),a(),l(85," from the previous version. When you upgrade, your configuration will be migrated, but "),o(86,"strong"),l(87,"the way pages and widgets are arranged will change significantly"),a(),l(88,`.
`),a(),o(89,"ul")(90,"li"),l(91,"All Skip configuration settings will be migrated."),a(),o(92,"li"),l(93,"Each v2 Page layout becomes its own v3 page."),a(),o(94,"li"),l(95,"All widgets and their settings will appear in their new pages."),a(),o(96,"li")(97,"span",0)(98,"strong"),l(99,"Note:"),a(),l(100," Widget positions, order, and sizes "),o(101,"strong"),l(102,"WILL BE LOST"),a(),l(103,". After upgrading, pages will contain small widgets that you must reposition and resize manually."),a()()(),o(104,"p"),l(105,"To upgrade your configuration, follow these steps:"),a(),o(106,"ol")(107,"li"),l(108," As a safety measure, if you are using Signal K authentication, manually back up your configuration. Make a copy of the "),o(109,"code"),l(110,"9.0.0.json"),a(),l(111," files found on the Signal K server in the following folders: "),o(112,"ul")(113,"li")(114,"code"),l(115,"~/.signalk/applicationData/users/(username)/kip/"),a()(),o(116,"li")(117,"code"),l(118,"~/.signalk/applicationData/global/kip/"),a()()()(),o(119,"li"),l(120,"Click the "),o(121,"strong"),l(122,"Upgrade"),a(),l(123," button below."),a(),o(124,"li"),l(125,"Once the upgrade is complete, Skip will restart and display the migrated pages."),a(),o(126,"li"),l(127,"Reposition and resize your widgets as needed."),a(),o(128,"li"),l(129,"Once satisfied, delete the "),o(130,"code"),l(131,"9.0.0.json"),a(),l(132," configuration files located in the previously mentioned folders. They are not needed any more."),a()(),o(133,"p"),l(134," For tips and guidance, consult Skip\u2019s in-app "),o(135,"strong"),l(136,"Help"),a(),l(137," section. Most common questions are answered there. If you need support, join the "),o(138,"a",4),l(139,"Signal K #kip Discord channel"),a(),l(140,`.
`),a(),o(141,"div",5)(142,"button",6),C("click",function(){return i.upgrade()}),l(143,"Upgrade"),a(),o(144,"button",7),C("click",function(){return i.startFresh()}),l(145,"Start Fresh"),a()())},dependencies:[Xe,se,Se],styles:[".button-group[_ngcontent-%COMP%]{display:flex;justify-content:center}.nav-table[_ngcontent-%COMP%]{width:100%;border-collapse:collapse;margin-bottom:2em}.nav-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], .nav-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]{border:1px solid #bbb;padding:.5em 1em;text-align:center}.nav-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%]{background:#ddd;color:#222;font-weight:700}.nav-table[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:nth-child(2n){background:#242424}.warning[_ngcontent-%COMP%]{color:#b71c1c}.button-group[_ngcontent-%COMP%]{margin-top:2em;display:flex;gap:20px}"]})}return n})();var kh=(n,s)=>s.id;function wh(n,s){if(n&1){let e=P();o(0,"div",2),C("click",function(){let i=y(e).$implicit,r=u();return x(r.selectIcon(i.id))})("keydown.enter",function(){let i=y(e).$implicit,r=u();return x(r.selectIcon(i.id))})("keydown.space",function(i){let r=y(e).$implicit;return u().selectIcon(r.id),x(i.preventDefault())}),o(1,"div",3),b(2,"mat-icon",4),a()()}if(n&2){let e=s.$implicit,t=u();G("selected",t.selected()===e.id),$("aria-label","Select "+e.id+" icon"),d(2),zt("width",64,"px")("height",64,"px"),g("svgIcon",e.id)}}var Al=(()=>{class n{iconFile=S("assets/svg/icons.svg");currentIcon=S(void 0);selectedIcon=bt();icons=T([]);selected=T("");constructor(){this.loadIcons(),Gt(()=>{let e=this.currentIcon();Ka(()=>{e&&this.selected()!==e&&this.selected.set(e)})})}loadIcons(){return N(this,null,function*(){try{let t=yield(yield fetch(this.iconFile())).text(),c=new DOMParser().parseFromString(t,"image/svg+xml").querySelector("defs");if(!c)return;let p=c.querySelectorAll("svg"),_=[];p.forEach(w=>{let M=w.getAttribute("id");M&&M.startsWith("dashboard-")&&_.push({id:M})}),this.icons.set(_);let k=this.currentIcon();k&&this.selected.set(k)}catch(e){console.error("Error loading icons:",e)}})}selectIcon(e){this.selected.set(e),this.selectedIcon.emit(e)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["select-icon"]],inputs:{iconFile:[1,"iconFile"],currentIcon:[1,"currentIcon"]},outputs:{selectedIcon:"selectedIcon"},decls:3,vars:0,consts:[[1,"icon-grid"],["tabindex","0",1,"icon-item",3,"selected"],["tabindex","0",1,"icon-item",3,"click","keydown.enter","keydown.space"],[1,"icon-container"],["aria-hidden","false",3,"svgIcon"]],template:function(t,i){t&1&&(o(0,"div",0),I(1,wh,3,8,"div",1,kh),a()),t&2&&(d(),A(i.icons()))},dependencies:[de,K],styles:[".icon-grid[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:16px;padding:16px;max-height:400px;overflow-y:auto}.icon-item[_ngcontent-%COMP%]{display:flex;flex-direction:column;align-items:center;padding:8px;border:2px solid transparent;border-radius:8px;cursor:pointer;transition:border-color .2s ease;background-color:var(--mat-sys-surface-container-low)}.icon-item[_ngcontent-%COMP%]:hover{outline:2px solid var(--mat-sys-on-primary-container);outline-offset:2px}.icon-item.selected[_ngcontent-%COMP%]{outline:2px solid var(--mat-sys-on-primary-container);outline-offset:2px;background-color:var(--mat-sys-primary-container)}.icon-item[_ngcontent-%COMP%]:focus{outline:2px solid var(--mat-sys-on-primary-container);outline-offset:2px}.icon-container[_ngcontent-%COMP%]{width:64px;height:64px;display:flex;align-items:center;justify-content:center;overflow:hidden}.icon-container[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{width:100%;height:100%;fill:currentColor}"]})}return n})();var Sh=(n,s)=>s.value;function Mh(n,s){if(n&1&&(o(0,"mat-option",21),l(1),a()),n&2){let e=s.$implicit;g("value",e),d(),v(e)}}function Th(n,s){if(n&1&&(o(0,"mat-option",21),l(1),a()),n&2){let e=s.$implicit;g("value",e.value),d(),v(e.label)}}function Eh(n,s){if(n&1){let e=P();o(0,"div",19)(1,"mat-form-field",8)(2,"mat-label"),l(3,"Signal K path"),a(),o(4,"input",20),li("ngModelChange",function(i){y(e);let r=u(2);return ri(r.triggerPath,i)||(r.triggerPath=i),x(i)}),C("ngModelChange",function(){y(e);let i=u(2);return x(i.onPathChange())}),a(),o(5,"mat-autocomplete",null,1),I(7,Mh,2,2,"mat-option",21,_e),a(),o(9,"mat-hint"),l(10,"e.g. self.navigation.state"),a()()(),o(11,"div",19)(12,"mat-form-field",8)(13,"mat-label"),l(14,"Value"),a(),o(15,"input",22),li("ngModelChange",function(i){y(e);let r=u(2);return ri(r.triggerValue,i)||(r.triggerValue=i),x(i)}),a(),o(16,"mat-autocomplete",null,2),I(18,Th,2,2,"mat-option",21,Sh),a(),o(20,"mat-hint"),l(21,"e.g. sailing"),a()()()}if(n&2){let e=Y(6),t=Y(17),i=u(2);d(4),oi("ngModel",i.triggerPath),g("matAutocomplete",e),d(3),A(i.filteredPaths),d(8),oi("ngModel",i.triggerValue),g("matAutocomplete",t),d(3),A(i.filteredValueOptions)}}function Ih(n,s){if(n&1){let e=P();o(0,"div",14)(1,"mat-checkbox",18),li("ngModelChange",function(i){y(e);let r=u();return ri(r.triggerEnabled,i)||(r.triggerEnabled=i),x(i)}),l(2," Auto-show this page on a Signal K value "),a(),h(3,Eh,22,4),a()}if(n&2){let e=u();d(),oi("ngModel",e.triggerEnabled),d(2),f(e.triggerEnabled?3:-1)}}function Ah(n,s){if(n&1&&(o(0,"button",17),l(1),a()),n&2){let e=u(),t=Y(1);g("disabled",!t.valid),d(),v(e.data.confirmBtnText)}}var Dh=50,Dl=(()=>{class n{dialogRef=m(Ct);data=m(dt);_data=m(tt);triggerEnabled=!1;triggerPath="";triggerValue="";_pathOptions=[];_valueOptions=[];constructor(){this.data.icon||(this.data.icon="dashboard-dashboard");let e=this.data.trigger;e&&(this.triggerEnabled=!0,this.triggerPath=e.path,this.triggerValue=e.value),this._pathOptions=this._data.getCachedPaths(!0).slice().sort((t,i)=>t.localeCompare(i)),this.refreshValueOptions()}get filteredPaths(){let e=this.triggerPath.trim().toLowerCase();return(e?this._pathOptions.filter(i=>i.toLowerCase().includes(e)):this._pathOptions).slice(0,Dh)}get filteredValueOptions(){let e=this.triggerValue.trim().toLowerCase();return e?this._valueOptions.filter(t=>t.value.toLowerCase().includes(e)||t.label.toLowerCase().includes(e)):this._valueOptions}onPathChange(){this.refreshValueOptions()}onIconSelected(e){this.data.icon=e}save(){this.data.enableTrigger&&(this.data.trigger=this.buildTrigger()),this.dialogRef.close(this.data)}refreshValueOptions(){let e=this.triggerPath.trim()?this._data.getPathMeta(this.triggerPath.trim()):null;this._valueOptions=(e?.possibleValues??[]).map(t=>({value:String(t.value),label:t.title??String(t.value)}))}buildTrigger(){if(!this.triggerEnabled)return null;let e=this.triggerPath.trim(),t=this.triggerValue.trim();return!e||!t?null:{path:e,value:t}}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["dialog-dashboard-page-editor"]],decls:26,vars:9,consts:[["name","ngForm"],["pathAuto","matAutocomplete"],["valueAuto","matAutocomplete"],["name","name",3,"ngSubmit"],[1,"dialogue-header"],["mat-dialog-title",""],["mat-icon-button","",1,"dialog-close-icon",3,"mat-dialog-close"],[1,"field-wrapper","field-margin"],[1,"field-flex"],["matInput","","type","text","id","name","placeholder","Name","name","name","required","","cdkFocusInitial","",3,"ngModelChange","ngModel"],[1,"field-margin","icon-section"],[2,"font-size","1.2em"],[1,"icon-selector"],[3,"selectedIcon","iconFile","currentIcon"],[1,"field-margin","trigger-section"],["align","end"],["mat-flat-button","",3,"mat-dialog-close"],["mat-flat-button","","type","submit",3,"disabled"],["name","triggerEnabled",3,"ngModelChange","ngModel"],[1,"field-wrapper"],["matInput","","name","triggerPath","aria-label","Auto-show Signal K path",3,"ngModelChange","ngModel","matAutocomplete"],[3,"value"],["matInput","","name","triggerValue","aria-label","Auto-show trigger value",3,"ngModelChange","ngModel","matAutocomplete"]],template:function(t,i){if(t&1){let r=P();o(0,"form",3,0),C("ngSubmit",function(){return i.save()}),o(2,"div",4)(3,"h5",5),l(4),a(),o(5,"button",6)(6,"mat-icon"),l(7,"close"),a()()(),o(8,"mat-dialog-content")(9,"div",7)(10,"mat-form-field",8)(11,"mat-label"),l(12,"Display Name"),a(),o(13,"input",9),li("ngModelChange",function(p){return y(r),ri(i.data.name,p)||(i.data.name=p),x(p)}),a(),o(14,"mat-error"),l(15," A name is required "),a()()(),o(16,"div",10)(17,"span",11),l(18,"Icon Gallery"),a(),o(19,"div",12)(20,"select-icon",13),C("selectedIcon",function(p){return i.onIconSelected(p)}),a()()(),h(21,Ih,4,2,"div",14),a(),o(22,"mat-dialog-actions",15)(23,"button",16),l(24),a(),h(25,Ah,2,2,"button",17),a()()}t&2&&(d(4),v(i.data.title),d(),g("mat-dialog-close",!1),d(8),oi("ngModel",i.data.name),d(7),g("iconFile","assets/svg/icons.svg")("currentIcon",i.data.icon),d(),f(i.data.enableTrigger?21:-1),d(2),g("mat-dialog-close",!1),d(),v(i.data.cancelBtnText),d(),f(i.data.confirmBtnText?25:-1))},dependencies:[Xe,yt,xt,qt,kt,de,K,he,te,Z,ot,gt,Te,ge,se,Se,le,Mi,ti,ee,Rt,je,Ae,$e,_i,fe,Q,ce,Me,un,jt,Al],styles:[".dialogue-header[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:baseline}.dialog-close-icon[_ngcontent-%COMP%]{margin-right:15px}.mat-mdc-dialog-content[_ngcontent-%COMP%]{max-height:max-content}.field-wrapper[_ngcontent-%COMP%]{display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;align-content:center}.field-margin[_ngcontent-%COMP%]{margin-left:15px;margin-bottom:15px}.field-flex[_ngcontent-%COMP%]{flex:auto}.icon-selector[_ngcontent-%COMP%]{border:1px solid var(--mat-sys-outline);border-radius:4px}.icon-section[_ngcontent-%COMP%]   .mat-label[_ngcontent-%COMP%]{display:block;margin-bottom:8px;color:var(--mat-sys-on-surface);font-size:14px;font-weight:400}.trigger-section[_ngcontent-%COMP%]   mat-checkbox[_ngcontent-%COMP%]{display:block;margin-bottom:8px}.trigger-section[_ngcontent-%COMP%]   .field-wrapper[_ngcontent-%COMP%] + .field-wrapper[_ngcontent-%COMP%]{margin-top:12px}"]})}return n})();var Pl="mat-badge-content",Ph=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["ng-component"]],decls:0,vars:0,template:function(t,i){},styles:[`.mat-badge {
  position: relative;
}
.mat-badge.mat-badge {
  overflow: visible;
}

.mat-badge-content {
  position: absolute;
  text-align: center;
  display: inline-block;
  transition: transform 200ms ease-in-out;
  transform: scale(0.6);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-sizing: border-box;
  pointer-events: none;
  background-color: var(--mat-badge-background-color, var(--mat-sys-error));
  color: var(--mat-badge-text-color, var(--mat-sys-on-error));
  font-family: var(--mat-badge-text-font, var(--mat-sys-label-small-font));
  font-weight: var(--mat-badge-text-weight, var(--mat-sys-label-small-weight));
  border-radius: var(--mat-badge-container-shape, var(--mat-sys-corner-full));
}
.mat-badge-above .mat-badge-content {
  bottom: 100%;
}
.mat-badge-below .mat-badge-content {
  top: 100%;
}
.mat-badge-before .mat-badge-content {
  right: 100%;
}
[dir=rtl] .mat-badge-before .mat-badge-content {
  right: auto;
  left: 100%;
}
.mat-badge-after .mat-badge-content {
  left: 100%;
}
[dir=rtl] .mat-badge-after .mat-badge-content {
  left: auto;
  right: 100%;
}
@media (forced-colors: active) {
  .mat-badge-content {
    outline: solid 1px;
    border-radius: 0;
  }
}

.mat-badge-disabled .mat-badge-content {
  background-color: var(--mat-badge-disabled-state-background-color, color-mix(in srgb, var(--mat-sys-error) 38%, transparent));
  color: var(--mat-badge-disabled-state-text-color, var(--mat-sys-on-error));
}

.mat-badge-hidden .mat-badge-content {
  display: none;
}

.ng-animate-disabled .mat-badge-content,
.mat-badge-content._mat-animation-noopable {
  transition: none;
}

.mat-badge-content.mat-badge-active {
  transform: none;
}

.mat-badge-small .mat-badge-content {
  width: var(--mat-badge-legacy-small-size-container-size, unset);
  height: var(--mat-badge-legacy-small-size-container-size, unset);
  min-width: var(--mat-badge-small-size-container-size, 6px);
  min-height: var(--mat-badge-small-size-container-size, 6px);
  line-height: var(--mat-badge-small-size-line-height, 6px);
  padding: var(--mat-badge-small-size-container-padding, 0);
  font-size: var(--mat-badge-small-size-text-size, 0);
  margin: var(--mat-badge-small-size-container-offset, -6px 0);
}
.mat-badge-small.mat-badge-overlap .mat-badge-content {
  margin: var(--mat-badge-small-size-container-overlap-offset, -6px);
}

.mat-badge-medium .mat-badge-content {
  width: var(--mat-badge-legacy-container-size, unset);
  height: var(--mat-badge-legacy-container-size, unset);
  min-width: var(--mat-badge-container-size, 16px);
  min-height: var(--mat-badge-container-size, 16px);
  line-height: var(--mat-badge-line-height, 16px);
  padding: var(--mat-badge-container-padding, 0 4px);
  font-size: var(--mat-badge-text-size, var(--mat-sys-label-small-size));
  margin: var(--mat-badge-container-offset, -12px 0);
}
.mat-badge-medium.mat-badge-overlap .mat-badge-content {
  margin: var(--mat-badge-container-overlap-offset, -12px);
}

.mat-badge-large .mat-badge-content {
  width: var(--mat-badge-legacy-large-size-container-size, unset);
  height: var(--mat-badge-legacy-large-size-container-size, unset);
  min-width: var(--mat-badge-large-size-container-size, 16px);
  min-height: var(--mat-badge-large-size-container-size, 16px);
  line-height: var(--mat-badge-large-size-line-height, 16px);
  padding: var(--mat-badge-large-size-container-padding, 0 4px);
  font-size: var(--mat-badge-large-size-text-size, var(--mat-sys-label-small-size));
  margin: var(--mat-badge-large-size-container-offset, -12px 0);
}
.mat-badge-large.mat-badge-overlap .mat-badge-content {
  margin: var(--mat-badge-large-size-container-overlap-offset, -12px);
}
`],encapsulation:2,changeDetection:0})}return n})(),G1=(()=>{class n{_ngZone=m(ae);_elementRef=m(X);_ariaDescriber=m(bo);_renderer=m(Be);_animationsDisabled=Ie();_idGenerator=m(ye);get color(){return this._color}set color(e){this._setColor(e),this._color=e}_color="primary";overlap=!0;disabled=!1;position="above after";get content(){return this._content}set content(e){this._updateRenderedContent(e)}_content;get description(){return this._description}set description(e){this._updateDescription(e)}_description;size="medium";hidden=!1;_badgeElement;_inlineBadgeDescription;_isInitialized=!1;_interactivityChecker=m(ho);_document=m(jn);constructor(){let e=m(st);e.load(Ph),e.load(so)}isAbove(){return this.position.indexOf("below")===-1}isAfter(){return this.position.indexOf("before")===-1}getBadgeElement(){return this._badgeElement}ngOnInit(){this._clearExistingBadges(),this.content&&!this._badgeElement&&(this._badgeElement=this._createBadgeElement(),this._updateRenderedContent(this.content)),this._isInitialized=!0}ngAfterViewInit(){}ngOnDestroy(){this._renderer.destroyNode&&(this._renderer.destroyNode(this._badgeElement),this._inlineBadgeDescription?.remove()),this._ariaDescriber.removeDescription(this._elementRef.nativeElement,this.description)}_isHostInteractive(){return this._interactivityChecker.isFocusable(this._elementRef.nativeElement,{ignoreVisibility:!0})}_createBadgeElement(){let e=this._renderer.createElement("span"),t="mat-badge-active";return e.setAttribute("id",this._idGenerator.getId("mat-badge-content-")),e.setAttribute("aria-hidden","true"),e.classList.add(Pl),this._animationsDisabled&&e.classList.add("_mat-animation-noopable"),this._elementRef.nativeElement.appendChild(e),typeof requestAnimationFrame=="function"&&!this._animationsDisabled?this._ngZone.runOutsideAngular(()=>{requestAnimationFrame(()=>{e.classList.add(t)})}):e.classList.add(t),e}_updateRenderedContent(e){let t=`${e??""}`.trim();this._isInitialized&&t&&!this._badgeElement&&(this._badgeElement=this._createBadgeElement()),this._badgeElement&&(this._badgeElement.textContent=t),this._content=t}_updateDescription(e){this._ariaDescriber.removeDescription(this._elementRef.nativeElement,this.description),(!e||this._isHostInteractive())&&this._removeInlineDescription(),this._description=e,this._isHostInteractive()?this._ariaDescriber.describe(this._elementRef.nativeElement,e):this._updateInlineDescription()}_updateInlineDescription(){this._inlineBadgeDescription||(this._inlineBadgeDescription=this._document.createElement("span"),this._inlineBadgeDescription.classList.add("cdk-visually-hidden")),this._inlineBadgeDescription.textContent=this.description,this._badgeElement?.appendChild(this._inlineBadgeDescription)}_removeInlineDescription(){this._inlineBadgeDescription?.remove(),this._inlineBadgeDescription=void 0}_setColor(e){let t=this._elementRef.nativeElement.classList;t.remove(`mat-badge-${this._color}`),e&&t.add(`mat-badge-${e}`)}_clearExistingBadges(){let e=this._elementRef.nativeElement.querySelectorAll(`:scope > .${Pl}`);for(let t of Array.from(e))t!==this._badgeElement&&t.remove()}static \u0275fac=function(t){return new(t||n)};static \u0275dir=pe({type:n,selectors:[["","matBadge",""]],hostAttrs:[1,"mat-badge"],hostVars:20,hostBindings:function(t,i){t&2&&G("mat-badge-overlap",i.overlap)("mat-badge-above",i.isAbove())("mat-badge-below",!i.isAbove())("mat-badge-before",!i.isAfter())("mat-badge-after",i.isAfter())("mat-badge-small",i.size==="small")("mat-badge-medium",i.size==="medium")("mat-badge-large",i.size==="large")("mat-badge-hidden",i.hidden||!i.content)("mat-badge-disabled",i.disabled)},inputs:{color:[0,"matBadgeColor","color"],overlap:[2,"matBadgeOverlap","overlap",D],disabled:[2,"matBadgeDisabled","disabled",D],position:[0,"matBadgePosition","position"],content:[0,"matBadge","content"],description:[0,"matBadgeDescription","description"],size:[0,"matBadgeSize","size"],hidden:[2,"matBadgeHidden","hidden",D]}})}return n})(),Ol=(()=>{class n{static \u0275fac=function(t){return new(t||n)};static \u0275mod=we({type:n});static \u0275inj=ke({imports:[go,Fe]})}return n})();var Oh=(n,s)=>s.path;function Fh(n,s){n&1&&(o(0,"mat-icon"),l(1,"info"),a())}function Rh(n,s){n&1&&(o(0,"mat-icon"),l(1,"info"),a())}function Nh(n,s){n&1&&(o(0,"mat-icon",3),l(1,"report"),a())}function Lh(n,s){n&1&&(o(0,"mat-icon",4),l(1,"warning"),a())}function Vh(n,s){n&1&&(o(0,"mat-icon",5),l(1,"error"),a())}function Gh(n,s){n&1&&(o(0,"mat-icon",6),l(1,"emergency_home"),a())}function Bh(n,s){if(n&1){let e=P();o(0,"div",2),h(1,Fh,2,0,"mat-icon")(2,Rh,2,0,"mat-icon")(3,Nh,2,0,"mat-icon",3)(4,Lh,2,0,"mat-icon",4)(5,Vh,2,0,"mat-icon",5)(6,Gh,2,0,"mat-icon",6),o(7,"div",7),l(8),a(),o(9,"div",8),l(10),Ce(11,"slice"),a(),o(12,"div",9),l(13),a(),o(14,"button",10),C("click",function(){let i=y(e).$implicit,r=u();return x(r.silence(i.path))}),o(15,"mat-icon"),l(16,"music_off"),a()(),o(17,"button",11),C("click",function(){let i=y(e).$implicit,r=u();return x(r.clear(i.path))}),o(18,"mat-icon"),l(19,"published_with_changes"),a()()(),b(20,"mat-divider",12)}if(n&2){let e,t=s.$implicit;d(),f((e=t.value==null?null:t.value.state)==="nominal"?1:e==="normal"?2:e==="alert"?3:e==="warn"?4:e==="alarm"?5:e==="emergency"?6:-1),d(7),v(t.value==null?null:t.value.state),d(2),B(" ",Fi(11,5,t.path,14)," "),d(3),v(t.value==null?null:t.value.message),d(),g("disabled",!(!(t.value==null||t.value.method==null)&&t.value.method.includes("sound")))}}function zh(n,s){n&1&&(o(0,"mat-list-item",13)(1,"span",15),l(2,"Notifications Disabled"),a(),o(3,"span")(4,"i"),l(5,"*Enable notifications in Settings."),a()()())}function Uh(n,s){n&1&&(o(0,"mat-list-item",14)(1,"i"),l(2,'"No Notification"'),a()())}function Wh(n,s){if(n&1&&h(0,zh,6,0,"mat-list-item",13)(1,Uh,3,0,"mat-list-item",14),n&2){let e=u();f(e.notificationConfig().disableNotifications?0:1)}}function $h(n,s){if(n&1){let e=P();o(0,"button",17),C("click",function(){y(e);let i=u(2);return x(i.mutePlayer(!i.isMuted))}),o(1,"span",18),l(2,"volume_up"),a(),l(3," Unmute Audio "),a()}}function qh(n,s){if(n&1){let e=P();o(0,"button",17),C("click",function(){y(e);let i=u(2);return x(i.mutePlayer(!i.isMuted))}),o(1,"span",18),l(2,"volume_off"),a(),l(3," Mute Audio "),a()}}function Hh(n,s){if(n&1&&h(0,$h,4,0,"button",16)(1,qh,4,0,"button",16),n&2){let e=u();f(e.isMuted?0:1)}}var Fl=(()=>{class n{_notificationsService=m(Qo);_notifications$=this._notificationsService.observeNotifications();notificationConfig=Ni(this._notificationsService.observeNotificationConfiguration(),{requireSync:!0});menuNotifications=Ni(Ea([this._notifications$,this._notificationsService.observeNotificationConfiguration()]).pipe(at(([e,t])=>{let i=[];return t.devices.showNormalState||i.push(Cn.Normal),t.devices.showNominalState||i.push(Cn.Nominal),e.filter(r=>r.value&&r.value.state&&!i.includes(r.value.state)).filter(r=>{let c=r.value?.method;return c?.length?c.includes(yn.Visual)||c.includes(yn.Sound):!1})})),{requireSync:!0,equal:ao});isMuted=!1;mutePlayer(e){this.isMuted=e,this._notificationsService.mutePlayer(e)}silence(e){this._notificationsService.setSkMethod(e,[yn.Visual])}clear(e){this._notificationsService.setSkState(e,Cn.Normal)}static \u0275fac=function(t){return new(t||n)};static \u0275cmp=E({type:n,selectors:[["menu-notifications"]],decls:6,vars:2,consts:[[1,"menu-item-container"],[1,"actions-container","actions-bottom-container"],[1,"notification-container"],[1,"icon-alert-color"],[1,"icon-warn-color"],[1,"icon-alarm-color"],[1,"icon-emergency-color"],[1,"notification-title"],[1,"notification-path","scrollable-text"],[1,"notification-text"],["mat-icon-button","",1,"notification-action-btn",3,"click","disabled"],["mat-icon-button","",1,"notification-action-btn",3,"click"],[1,"notification-divider"],["lines","3","disabled","true",2,"text-align","center"],["disabled","true",2,"text-align","center"],["matListItemTitle",""],["mat-flat-button","","matTooltip","Temporally toggle all notification audio. To permanently disable/enable notification audio, use the configuration settings option",1,"action-button"],["mat-flat-button","","matTooltip","Temporally toggle all notification audio. To permanently disable/enable notification audio, use the configuration settings option",1,"action-button",3,"click"],[1,"material-icons"]],template:function(t,i){t&1&&(o(0,"mat-list",0),I(1,Bh,21,8,null,null,Oh,!1,Wh,2,1),a(),o(4,"div",1),h(5,Hh,2,1),a()),t&2&&(d(),A(i.menuNotifications()),d(4),f(i.notificationConfig().disableNotifications?-1:5))},dependencies:[er,Xo,Jo,et,Zo,se,Se,le,Ol,En,Tn,de,K,to],styles:[".notification-container[_ngcontent-%COMP%]{display:flex;flex-direction:row;flex-wrap:wrap;justify-content:space-evenly;padding:2px 10px 7px;scroll-behavior:smooth}mat-icon[_ngcontent-%COMP%]{margin-right:10px}.scrollable-text[_ngcontent-%COMP%]{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.scrollable-text[_ngcontent-%COMP%]:hover{overflow:auto;white-space:normal;word-wrap:break-word}.notification-title[_ngcontent-%COMP%]{text-transform:capitalize;font-size:var(--mat-sys-headline-small-size);width:calc(100% - 34px)}.notification-path[_ngcontent-%COMP%]{font-size:var(--mat-sys-body-small-size);word-break:break-all;width:100%}.notification-text[_ngcontent-%COMP%]{font-size:var(--mat-sys-body-small-line-height);font-style:italic;width:100%;overflow:auto;white-space:normal;word-wrap:break-word}.notification-action-btn[_ngcontent-%COMP%]{background-color:var(--mat-sys-surface-container)}.notification-btn-container[_ngcontent-%COMP%]{display:inline-block;width:50%;height:48px;text-align:center}.menu-item-container[_ngcontent-%COMP%]{width:230px;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;height:calc(100% - 48px)}.notification-bottom-container[_ngcontent-%COMP%]{position:absolute;bottom:0;width:100%;background-color:var(--mat-sys-surface-container)}.actions-container[_ngcontent-%COMP%]{display:grid;grid-auto-flow:column}.actions-bottom-container[_ngcontent-%COMP%]{position:absolute;bottom:0;width:100%;height:48px}.action-button[_ngcontent-%COMP%]{border-radius:0;height:48px;border-bottom-right-radius:var(--mat-sidenav-container-shape, var(--mat-sys-corner-large))}.icon-alert-color[_ngcontent-%COMP%]{color:var(--skip-zone-alert-color)}.icon-warn-color[_ngcontent-%COMP%]{color:var(--skip-zone-warn-color)}.icon-alarm-color[_ngcontent-%COMP%]{color:var(--skip-zone-alarm-color)}.icon-emergency-color[_ngcontent-%COMP%]{color:var(--skip-zone-emergency-color)}.alarm-emergency-blink[_ngcontent-%COMP%]{animation:_ngcontent-%COMP%_blinking-emergency 1.5s infinite}@keyframes _ngcontent-%COMP%_blinking-emergency{0%{background-color:var(--skip-zone-alarm-color)}50%{background-color:transparent}to{background-color:var(--skip-zone-alarm-color)}}.warn[_ngcontent-%COMP%]{color:var(--skip-zone-warn-color)}.notification-divider[_ngcontent-%COMP%]{padding-top:10px}"],changeDetection:0})}return n})();var fk=(()=>{class n{dialog=m(Po);openNotifications(){return this.dialog.open(Fn,{data:{title:"Notifications",component:"notifications",componentType:Fl},autoFocus:!1}).afterClosed()}openFrameDialog(e,t){switch(e.component){case"select-widget":e.componentType=vl;break;case"upgrade-config":e.componentType=Il;break;case"ais-target":e.componentType=Nr;break}return this.dialog.open(Fn,{data:e,height:t?"calc(100% - 30px)":"",width:t?"calc(100% - 30px)":"",maxWidth:t?"100%":"",maxHeight:t?"100%":""}).afterClosed()}openAisDetailDialog(e){return this.dialog.open(Fn,{panelClass:"ais-dialog-panel",data:e,height:"",width:"",maxWidth:"",maxHeight:""}).afterClosed()}openConfirmationDialog(e){return this.dialog.open(Lr,{data:e,minWidth:"35vw",minHeight:"25vh"}).afterClosed()}openNameDialog(e){return this.dialog.open(zr,{data:e,minWidth:"20vw",minHeight:"20vh",disableClose:!1})}openDashboardPageEditorDialog(e){return this.dialog.open(Dl,{data:e,minWidth:"60vw",maxWidth:"90vw",maxHeight:"95vh",disableClose:!1})}openWidgetOptions(e){return this.dialog.open(_l,{data:e.config,minWidth:"50vw",maxWidth:"90vw"})}openWidgetHistoryDialog(e){return N(this,null,function*(){let{WidgetHistoryGraphDialogComponent:t}=yield import("./chunk-54BOO2WI.js");return this.dialog.open(t,{data:e,minWidth:"70vw",maxWidth:"95vw",maxHeight:"95vh",disableClose:!1})})}static \u0275fac=function(t){return new(t||n)};static \u0275prov=xe({token:n,factory:n.\u0275fac,providedIn:"root"})}return n})();export{Z as a,gt as b,ur as c,te as d,ge as e,Te as f,Ae as g,fs as h,gs as i,kr as j,If as k,Af as l,Ls as m,wa as n,rl as o,ga as p,Pr as q,Rr as r,Nr as s,El as t,G1 as u,Ol as v,fk as w};
