import { cardSpriteBackground } from "./cardArtwork";
import { avatarCards } from "./playerAvatar";
import "./solo-menu.css";

export default function PlayerAvatar({id,className=""}:{id:string;className?:string}) {
  const card=avatarCards.find(card=>card.id===id);
  return <span className={"dl-player-avatar "+className} aria-hidden="true">
    <img className="dl-avatar-fallback" src="./branding/menu/crown.svg" alt=""/>
    {card?.art&&<span className="dl-avatar-art" style={{
      backgroundImage:cardSpriteBackground(card),
      backgroundPosition:(card.art.column*50)+"% "+(card.art.row*100)+"%"
    }}/>}
  </span>;
}
