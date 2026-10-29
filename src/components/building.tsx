export function Building() {
  return (
    <svg
      className="building-art"
      viewBox="0 0 560 420"
      role="img"
      aria-label="Иллюстрация студенческого общежития: окна, деревья и вход"
    >
      <rect width="560" height="420" fill="#e6eee9" />
      <circle cx="450" cy="86" r="38" fill="#f5b88a" />
      <path d="M0 345L560 305V420H0Z" fill="#cfdfd6" />
      <path d="M0 380L560 340" stroke="#b4cec0" strokeWidth="2" />
      <path d="M120 95L344 55L451 120V344L222 391L120 328Z" fill="#c7d4cd" />
      <path d="M120 95L344 55V333L120 378Z" fill="#f4f1e8" />
      <path d="M344 55L451 120V344L344 333Z" fill="#aebfb3" />
      <path d="M111 95L344 49L460 119L451 125L343 63L120 105Z" fill="#356254" />
      {[0, 1, 2, 3, 4].map((row) => (
        <g key={row}>
          {[0, 1, 2, 3, 4].map((col) => (
            <g key={col}>
              <path
                d={`M${139 + col * 39} ${119 + row * 46 - col * 8}l23 -4v27l-23 4z`}
                fill={(row + col) % 5 === 0 ? "#efb771" : "#48786a"}
              />
              <path
                d={`M${150 + col * 39} ${117 + row * 46 - col * 8}v27`}
                stroke="#e1e8da"
                strokeWidth="2"
              />
              <path
                d={`M${139 + col * 39} ${132 + row * 46 - col * 8}l23 -4`}
                stroke="#e1e8da"
                strokeWidth="2"
              />
            </g>
          ))}
        </g>
      ))}
      {[0, 1, 2, 3].map((row) => (
        <g key={row}>
          {[0, 1].map((col) => (
            <path
              key={col}
              d={`M${362 + col * 40} ${100 + row * 51 + col * 23}l21 12v29l-21 -12z`}
              fill="#517365"
            />
          ))}
        </g>
      ))}
      <path d="M204 362v-35l38 -7v35" fill="#285449" />
      <path d="M225 324v35" stroke="#9ab7a4" strokeWidth="2" />
      <path d="M193 366l57 -11 17 10-56 12z" fill="#8eaa99" />
      <path d="M194 370l56 -11 17 11-56 12z" fill="#b6c6b9" />
      <path d="M80 351V237M489 350V246" stroke="#587563" strokeWidth="7" />
      <path
        d="M80 175C39 180 30 230 41 256C17 285 54 311 81 299C107 315 145 280 119 253C137 215 115 179 80 175Z"
        fill="#678f77"
      />
      <path
        d="M490 210C460 215 448 252 461 272C439 296 468 321 491 310C513 323 540 291 522 269C533 239 514 214 490 210Z"
        fill="#81a18b"
      />
      <path
        d="M35 378l128 -26M407 379l115 -22"
        stroke="#aac3b3"
        strokeWidth="3"
      />
      <path
        d="M286 387v-25M300 385v-25M278 364l30 -6"
        stroke="#5c8070"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="371" cy="349" r="7" fill="#e5ad83" />
      <path
        d="M371 357v25m0-15l-11 8m11-8l11 6m-11 9l-7 12m7-12l8 10"
        stroke="#365b50"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="185" cy="379" r="6" fill="#dcaa85" />
      <path
        d="M185 387v20m0-15l-10 6m10-6l8 6"
        stroke="#a06446"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
