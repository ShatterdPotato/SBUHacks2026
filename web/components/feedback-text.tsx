import { Fragment } from 'react';

/** Only **emphasis** is supported. Provider/user text is never interpreted as HTML. */
export function FeedbackText({children}:{children:string}) {
    return <>{children.split(/(\*\*[^*\n]+\*\*)/g).map((part,index)=>
        part.startsWith('**')&&part.endsWith('**')&&part.length>4
            ? <strong key={index}>{part.slice(2,-2)}</strong>
            : <Fragment key={index}>{part}</Fragment>)}</>;
}
