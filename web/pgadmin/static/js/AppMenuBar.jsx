import { Box, makeStyles } from '@material-ui/core';
import React, { useState, useEffect } from 'react';
import { PrimaryButton } from './components/Buttons';
import { PgMenu, PgMenuDivider, PgMenuItem, PgSubMenu } from './components/Menu';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import AccountCircleRoundedIcon from '@material-ui/icons/AccountCircleRounded';
import pgAdmin from 'sources/pgadmin';

const useStyles = makeStyles((theme)=>({
  root: {
    height: '32px',
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    padding: '0 0.5rem',
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    width: '96px',
    height: '100%',
    /*
     * Using the SVG postgresql logo, modified to set the background color as #FFF
     * https://wiki.postgresql.org/images/9/90/PostgreSQL_logo.1color_blue.svg
     * background: url("data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!-- Generator: Adobe Illustrator 22.1.0, SVG Export Plug-In . SVG Version: 6.00 Build 0) --%3E%3Csvg version='1.1' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 42 42' style='enable-background:new 0 0 42 42;' xml:space='preserve'%3E%3Cstyle type='text/css'%3E .st0%7Bstroke:%23000000;stroke-width:3.3022;%7D .st1%7Bfill:%23336791;%7D .st2%7Bfill:none;stroke:%23FFFFFF;stroke-width:1.1007;stroke-linecap:round;stroke-linejoin:round;%7D .st3%7Bfill:none;stroke:%23FFFFFF;stroke-width:1.1007;stroke-linecap:round;stroke-linejoin:bevel;%7D .st4%7Bfill:%23FFFFFF;stroke:%23FFFFFF;stroke-width:0.3669;%7D .st5%7Bfill:%23FFFFFF;stroke:%23FFFFFF;stroke-width:0.1835;%7D .st6%7Bfill:none;stroke:%23FFFFFF;stroke-width:0.2649;stroke-linecap:round;stroke-linejoin:round;%7D%0A%3C/style%3E%3Cg id='orginal'%3E%3C/g%3E%3Cg id='Layer_x0020_3'%3E%3Cpath class='st0' d='M31.3,30c0.3-2.1,0.2-2.4,1.7-2.1l0.4,0c1.2,0.1,2.8-0.2,3.7-0.6c2-0.9,3.1-2.4,1.2-2 c-4.4,0.9-4.7-0.6-4.7-0.6c4.7-7,6.7-15.8,5-18c-4.6-5.9-12.6-3.1-12.7-3l0,0c-0.9-0.2-1.9-0.3-3-0.3c-2,0-3.5,0.5-4.7,1.4 c0,0-14.3-5.9-13.6,7.4c0.1,2.8,4,21.3,8.7,15.7c1.7-2,3.3-3.8,3.3-3.8c0.8,0.5,1.8,0.8,2.8,0.7l0.1-0.1c0,0.3,0,0.5,0,0.8 c-1.2,1.3-0.8,1.6-3.2,2.1c-2.4,0.5-1,1.4-0.1,1.6c1.1,0.3,3.7,0.7,5.5-1.8l-0.1,0.3c0.5,0.4,0.4,2.7,0.5,4.4 c0.1,1.7,0.2,3.2,0.5,4.1c0.3,0.9,0.7,3.3,3.9,2.6C29.1,38.3,31.1,37.5,31.3,30'/%3E%3Cpath class='st1' d='M38.3,25.3c-4.4,0.9-4.7-0.6-4.7-0.6c4.7-7,6.7-15.8,5-18c-4.6-5.9-12.6-3.1-12.7-3l0,0 c-0.9-0.2-1.9-0.3-3-0.3c-2,0-3.5,0.5-4.7,1.4c0,0-14.3-5.9-13.6,7.4c0.1,2.8,4,21.3,8.7,15.7c1.7-2,3.3-3.8,3.3-3.8 c0.8,0.5,1.8,0.8,2.8,0.7l0.1-0.1c0,0.3,0,0.5,0,0.8c-1.2,1.3-0.8,1.6-3.2,2.1c-2.4,0.5-1,1.4-0.1,1.6c1.1,0.3,3.7,0.7,5.5-1.8 l-0.1,0.3c0.5,0.4,0.8,2.4,0.7,4.3c-0.1,1.9-0.1,3.2,0.3,4.2c0.4,1,0.7,3.3,3.9,2.6c2.6-0.6,4-2,4.2-4.5c0.1-1.7,0.4-1.5,0.5-3 l0.2-0.7c0.3-2.3,0-3.1,1.7-2.8l0.4,0c1.2,0.1,2.8-0.2,3.7-0.6C39,26.4,40.2,24.9,38.3,25.3L38.3,25.3z'/%3E%3Cpath class='st2' d='M21.8,26.6c-0.1,4.4,0,8.8,0.5,9.8c0.4,1.1,1.3,3.2,4.5,2.5c2.6-0.6,3.6-1.7,4-4.1c0.3-1.8,0.9-6.7,1-7.7'/%3E%3Cpath class='st2' d='M18,4.7c0,0-14.3-5.8-13.6,7.4c0.1,2.8,4,21.3,8.7,15.7c1.7-2,3.2-3.7,3.2-3.7'/%3E%3Cpath class='st2' d='M25.7,3.6c-0.5,0.2,7.9-3.1,12.7,3c1.7,2.2-0.3,11-5,18'/%3E%3Cpath class='st3' d='M33.5,24.6c0,0,0.3,1.5,4.7,0.6c1.9-0.4,0.8,1.1-1.2,2c-1.6,0.8-5.3,0.9-5.3-0.1 C31.6,24.5,33.6,25.3,33.5,24.6c-0.1-0.6-1.1-1.2-1.7-2.7c-0.5-1.3-7.3-11.2,1.9-9.7c0.3-0.1-2.4-8.7-11-8.9 c-8.6-0.1-8.3,10.6-8.3,10.6'/%3E%3Cpath class='st2' d='M19.4,25.6c-1.2,1.3-0.8,1.6-3.2,2.1c-2.4,0.5-1,1.4-0.1,1.6c1.1,0.3,3.7,0.7,5.5-1.8c0.5-0.8,0-2-0.7-2.3 C20.5,25.1,20,24.9,19.4,25.6L19.4,25.6z'/%3E%3Cpath class='st2' d='M19.3,25.5c-0.1-0.8,0.3-1.7,0.7-2.8c0.6-1.6,2-3.3,0.9-8.5c-0.8-3.9-6.5-0.8-6.5-0.3c0,0.5,0.3,2.7-0.1,5.2 c-0.5,3.3,2.1,6,5,5.7'/%3E%3Cpath class='st4' d='M18,13.8c0,0.2,0.3,0.7,0.8,0.7c0.5,0.1,0.9-0.3,0.9-0.5c0-0.2-0.3-0.4-0.8-0.4C18.4,13.6,18,13.7,18,13.8 L18,13.8z'/%3E%3Cpath class='st5' d='M32,13.5c0,0.2-0.3,0.7-0.8,0.7c-0.5,0.1-0.9-0.3-0.9-0.5c0-0.2,0.3-0.4,0.8-0.4C31.6,13.2,32,13.3,32,13.5 L32,13.5z'/%3E%3Cpath class='st2' d='M33.7,12.2c0.1,1.4-0.3,2.4-0.4,3.9c-0.1,2.2,1,4.7-0.6,7.2'/%3E%3Cpath class='st6' d='M2.7,6.6'/%3E%3C/g%3E%3C/svg%3E%0A")  0 0 no-repeat;
     */
    background: 'url(data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDUgNTAiPjxkZWZzPjxzdHlsZT4uY2xzLTF7ZmlsbDojZmZmO30uY2xzLTJ7ZmlsbDojMzI2ODkzO308L3N0eWxlPjwvZGVmcz48dGl0bGU+cGdBZG1pbjwvdGl0bGU+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNTguOTQsNDEuNGEyLjQ4LDIuNDgsMCwwLDEtMi4yNy0zLjQ5TDY0LDIxLjI5VjZhNiw2LDAsMCwwLTYtNkg2QTYsNiwwLDAsMCwwLDZWNDRhNiw2LDAsMCwwLDYsNkg1OGE2LDYsMCwwLDAsNi02VjQxLjRaIi8+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJNMjkuMjUsMzAuMTdhMTMuMTMsMTMuMTMsMCwwLDEtMS44Mi02LjkzLDEzLDEzLDAsMCwxLDEuODItNi44OCwxMi41LDEyLjUsMCwwLDEsMS40OC0xLjk1LDEwLjQ0LDEwLjQ0LDAsMCwwLTMuMjUtMi44OSwxMS4xNiwxMS4xNiwwLDAsMC01LjY1LTEuNDVxLTQuNDgsMC02LjcyLDIuNjRWMTAuNDRINy41MVY0MC4zNmExLDEsMCwwLDAsMSwxaDZhMSwxLDAsMCwwLDEtMVYzMS4xOWE4LjQ3LDguNDcsMCwwLDAsNi4zNCwyLjQsMTEuMjYsMTEuMjYsMCwwLDAsNS42NS0xLjQ1LDEwLjUzLDEwLjUzLDAsMCwwLDIuMDYtMS41NkMyOS40NCwzMC40NCwyOS4zNCwzMC4zMSwyOS4yNSwzMC4xN1pNMjMuNiwyNS44YTQuNTIsNC41MiwwLDAsMS0zLjQ1LDEuNDQsNC40OCw0LjQ4LDAsMCwxLTMuNDQtMS40NCw1LjYsNS42LDAsMCwxLTEuMzUtNCw1LjU5LDUuNTksMCwwLDEsMS4zNS00LDQuNDYsNC40NiwwLDAsMSwzLjQ0LTEuNDUsNC40OSw0LjQ5LDAsMCwxLDMuNDUsMS40NSw1LjYzLDUuNjMsMCwwLDEsMS4zNCw0QTUuNjQsNS42NCwwLDAsMSwyMy42LDI1LjhaIi8+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJNNTYuNDksMTIuNjNWMzEuMjRxMCw2LjM1LTMuNDQsOS41MXQtOS45MiwzLjE3YTI1LjQyLDI1LjQyLDAsMCwxLTYuMy0uNzUsMTUsMTUsMCwwLDEtNS0yLjIzbDIuODktNS41OWExMC4xNywxMC4xNywwLDAsMCwzLjUxLDEuNzksMTQuMzcsMTQuMzcsMCwwLDAsNC4xOC42NUE2LjUzLDYuNTMsMCwwLDAsNDcsMzYuNGE1LjM3LDUuMzcsMCwwLDAsMS40Ny00LjExdi0uNzZjLTEuNTQsMS44LTMuNzksMi42OS02Ljc2LDIuNjlhMTEuNywxMS43LDAsMCwxLTUuNTktMS4zNkExMC4zNywxMC4zNywwLDAsMSwzMi4wOSwyOWExMC44OSwxMC44OSwwLDAsMS0xLjUxLTUuNzcsMTAuODYsMTAuODYsMCwwLDEsMS41MS01Ljc0LDEwLjQyLDEwLjQyLDAsMCwxLDQuMDctMy44NiwxMS43MSwxMS43MSwwLDAsMSw1LjU5LTEuMzdjMy4yNSwwLDUuNjMsMS4wNiw3LjE0LDMuMTVWMTIuNjNabS05LjMsMTMuOTVhNC40LDQuNCwwLDAsMCwxLjQtMy4zNiw0LjM0LDQuMzQsMCwwLDAtMS4zOC0zLjM0LDUuNjUsNS42NSwwLDAsMC03LjE2LDAsNC4zLDQuMywwLDAsMC0xLjQxLDMuMzQsNC4zNSw0LjM1LDAsMCwwLDEuNDMsMy4zNiw1LjA4LDUuMDgsMCwwLDAsMy41NywxLjNBNSw1LDAsMCwwLDQ3LjE5LDI2LjU4WiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTgzLjQzLDMyLjg5SDcxbC0yLDUuMDlhMSwxLDAsMCwxLS45My42Mkg2MS43M2ExLDEsMCwwLDEtLjkxLTEuNEw3Mi45MSw5LjhhMSwxLDAsMCwxLC45Mi0uNmg2Ljg5YTEsMSwwLDAsMSwuOTEuNkw5My43NywzNy4yYTEsMSwwLDAsMS0uOTIsMS40SDg2LjQxYTEsMSwwLDAsMS0uOTMtLjYyWk04MSwyNi43NmwtMy43OC05LjQxLTMuNzgsOS40MVoiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xMjAuNDQsOC40NFYzNy42YTEsMSwwLDAsMS0xLDFoLTUuNmExLDEsMCwwLDEtMS0xVjM2LjMzUTExMC42MiwzOSwxMDYuMTYsMzlhMTEuMjksMTEuMjksMCwwLDEtNS42Ny0xLjQ1LDEwLjU0LDEwLjU0LDAsMCwxLTQtNC4xNEExMi42MiwxMi42MiwwLDAsMSw5NSwyNy4xOCwxMi41MywxMi41MywwLDAsMSw5Ni40NCwyMWExMC4zNSwxMC4zNSwwLDAsMSw0LTQuMDksMTEuNDgsMTEuNDgsMCwwLDEsNS42Ny0xLjQzLDguMjQsOC4yNCwwLDAsMSw2LjMsMi4zNVY4LjQ0YTEsMSwwLDAsMSwxLTFoNkExLDEsMCwwLDEsMTIwLjQ0LDguNDRabS05LjE5LDIyLjc1YTUuNzEsNS43MSwwLDAsMCwxLjM0LTQsNS42LDUuNiwwLDAsMC0xLjMyLTMuOTUsNC40Nyw0LjQ3LDAsMCwwLTMuNDMtMS40Myw0LjUzLDQuNTMsMCwwLDAtMy40NCwxLjQzLDUuNTEsNS41MSwwLDAsMC0xLjM0LDMuOTUsNS42Nyw1LjY3LDAsMCwwLDEuMzQsNCw0Ljc3LDQuNzcsMCwwLDAsNi44NSwwWiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE2MSwxOGMxLjY2LDEuNjgsMi41LDQuMjEsMi41LDcuNnYxMmExLDEsMCwwLDEtMSwxaC02YTEsMSwwLDAsMS0xLTFWMjYuODhhNS42Nyw1LjY3LDAsMCwwLS45LTMuNTMsMy4wOSwzLjA5LDAsMCwwLTIuNTUtMS4xMywzLjYyLDMuNjIsMCwwLDAtMi44OSwxLjI2LDUuNzEsNS43MSwwLDAsMC0xLjEsMy44MlYzNy42YTEsMSwwLDAsMS0xLDFoLTZhMSwxLDAsMCwxLTEtMVYyNi44OGMwLTMuMTEtMS4xNC00LjY2LTMuNDQtNC42NmEzLjcsMy43LDAsMCwwLTIuOTQsMS4yNiw1LjcxLDUuNzEsMCwwLDAtMS4wOSwzLjgyVjM3LjZhMSwxLDAsMCwxLTEsMWgtNmExLDEsMCwwLDEtMS0xVjE2Ljg0YTEsMSwwLDAsMSwxLTFoNS42YTEsMSwwLDAsMSwxLDF2MS4zOWE4LDgsMCwwLDEsMy0yLjA4LDEwLjIzLDEwLjIzLDAsMCwxLDMuOC0uNjksMTAsMTAsMCwwLDEsNC4yOS44OEE3LjI4LDcuMjgsMCwwLDEsMTQ2LjQyLDE5YTguODUsOC44NSwwLDAsMSwzLjQxLTIuNjUsMTAuOTMsMTAuOTMsMCwwLDEsNC40OS0uOTJBOSw5LDAsMCwxLDE2MSwxOFoiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xNjguMTIsMTIuMWEzLjkxLDMuOTEsMCwwLDEtMS4zNC0yLjc5QTQuMTYsNC4xNiwwLDAsMSwxNjgsNi4xOWE1LDUsMCwwLDEsMy42Ny0xLjM2QTUuMjUsNS4yNSwwLDAsMSwxNzUuMTgsNmEzLjc1LDMuNzUsMCwwLDEsMS4zNCwzLDQuMSw0LjEsMCwwLDEtMS4zNCwzLjEzLDUuNjgsNS42OCwwLDAsMS03LjA2LDBabS41NCwzLjc0aDZhMSwxLDAsMCwxLDEsMVYzNy42YTEsMSwwLDAsMS0xLDFoLTZhMSwxLDAsMCwxLTEtMVYxNi44NEExLDEsMCwwLDEsMTY4LjY2LDE1Ljg0WiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTIwMS41NSwxOHEyLjU5LDIuNTIsMi41OSw3LjZ2MTJhMSwxLDAsMCwxLTEsMWgtNmExLDEsMCwwLDEtMS0xVjI2Ljg4cTAtNC42Ni0zLjc0LTQuNjZhNC4zLDQuMywwLDAsMC0zLjMsMS4zNCw1LjgzLDUuODMsMCwwLDAtMS4yNCw0djEwYTEsMSwwLDAsMS0xLDFoLTZhMSwxLDAsMCwxLTEtMVYxNi44NGExLDEsMCwwLDEsMS0xaDUuNjFhMSwxLDAsMCwxLDEsMXYxLjQ3YTkuMDUsOS4wNSwwLDAsMSwzLjE5LTIuMTIsMTAuNzgsMTAuNzgsMCwwLDEsNC0uNzNBOS4zNCw5LjM0LDAsMCwxLDIwMS41NSwxOFoiLz48L3N2Zz4=)  0 0 no-repeat',
    backgroundPositionY: 'center',
  },
  menus: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    marginLeft: '16px',

    '& .MuiButton-containedPrimary': {
      padding: '2px 8px',
    }
  },
  menuButton: {
    fontSize: '0.925rem',
  },
  userMenu: {
    marginLeft: 'auto',
    '& .MuiButton-containedPrimary': {
      fontSize: '0.825rem',
    }
  },
  gravatar: {
    marginRight: '4px',
  }
}));



export default function AppMenuBar() {
  const classes = useStyles();
  const [,setRefresh] = useState(false);

  const reRenderMenus = ()=>setRefresh((prev)=>!prev);

  useEffect(()=>{
    pgAdmin.Browser.Events.on('pgadmin:nw-enable-disable-menu-items', ()=>{
      reRenderMenus();
    });
    pgAdmin.Browser.Events.on('pgadmin:nw-refresh-menu-item',  ()=>{
      reRenderMenus();
    });
  }, []);

  const getPgMenuItem = (menuItem, i)=>{
    if(menuItem.type == 'separator') {
      return <PgMenuDivider key={i}/>;
    }
    const hasCheck = typeof menuItem.checked == 'boolean';

    return <PgMenuItem
      key={i}
      disabled={menuItem.isDisabled}
      onClick={()=>{
        menuItem.callback();
        if(hasCheck) {
          reRenderMenus();
        }
      }}
      hasCheck={hasCheck}
      checked={menuItem.checked}
      closeOnCheck={true}
    >{menuItem.label}</PgMenuItem>;
  };

  const userMenuInfo = pgAdmin.Browser.utils.userMenuInfo;

  return(
    <>
      <Box className={classes.root}>
        <div className={classes.logo} />
        <div className={classes.menus}>
          {pgAdmin.Browser.MainMenus?.map((menu)=>{
            return (
              <PgMenu
                menuButton={<PrimaryButton key={menu.label} className={classes.menuButton} data-label={menu.label}>{menu.label}<KeyboardArrowDownIcon fontSize="small" /></PrimaryButton>}
                label={menu.label}
                key={menu.name}
              >
                {menu.getMenuItems().map((menuItem, i)=>{
                  const submenus = menuItem.getMenuItems();
                  if(submenus) {
                    return <PgSubMenu key={menuItem.label} label={menuItem.label}>
                      {submenus.map((submenuItem, si)=>{
                        return getPgMenuItem(submenuItem, si);
                      })}
                    </PgSubMenu>;
                  }
                  return getPgMenuItem(menuItem, i);
                })}
              </PgMenu>
            );
          })}
        </div>
        {userMenuInfo &&
        <div className={classes.userMenu}>
          <PgMenu
            menuButton={
              <PrimaryButton className={classes.menuButton} data-test="loggedin-username">
                <div className={classes.gravatar}>
                  {userMenuInfo.gravatar &&
                  <img src={userMenuInfo.gravatar} width = "18" height = "18"
                    alt ={`Gravatar image for ${ userMenuInfo.username }`} />}
                  {!userMenuInfo.gravatar && <AccountCircleRoundedIcon />}
                </div>
                { userMenuInfo.username } ({userMenuInfo.auth_source})
                <KeyboardArrowDownIcon fontSize="small" />
              </PrimaryButton>
            }
            label={userMenuInfo.username}
            align="end"
          >
            {userMenuInfo.menus.map((menuItem, i)=>{
              return getPgMenuItem(menuItem, i);
            })}
          </PgMenu>
        </div>}
      </Box>
    </>
  );
}
