import React from 'react';
import styled from 'styled-components';

const HeaderContainer = styled.header`
  background-color: #333;
  color: white;
  padding: 1rem;
  text-align: center;
`;

const HeaderText = styled.h1`
  margin: 0;
`;

const Header = () => {
  return (
    <HeaderContainer>
      <HeaderText>CROPWORLD</HeaderText>
    </HeaderContainer>
  );
};

export default Header;